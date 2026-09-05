import React, { useState, useEffect } from 'react';
import { X, Mail, MessageSquare, AlertCircle, CheckCircle2, Clock, Star, Search, Filter, ShieldCheck, ChevronRight, RefreshCw, Send, Plus, ZoomIn, Eye } from 'lucide-react';
import { SupportTicket } from '../types';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface SupportMailboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  onOpenNewTicket?: () => void;
}

export default function SupportMailboxModal({
  isOpen,
  onClose,
  userEmail = "guest@taashbhatti.com",
  onOpenNewTicket,
}: SupportMailboxModalProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'resolved' | 'complaints' | 'feedback' | 'suggestions'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const cleanUserEmail = userEmail.toLowerCase().trim();
  const [followUpMap, setFollowUpMap] = useState<Record<string, string>>({});
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState<Record<string, boolean>>({});

  // Load user tickets from Firestore & localStorage cache
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    let unsub = () => {};

    try {
      const colRef = collection(db, 'support_tickets');
      const currentUid = auth.currentUser?.uid;

      unsub = onSnapshot(
        colRef,
        (snapshot) => {
          const list: SupportTicket[] = [];

          // Retrieve cached ticket IDs created on this local device
          let localTicketIds: string[] = [];
          try {
            const cached = localStorage.getItem('fitzaika_support_tickets');
            if (cached) {
              const parsed: SupportTicket[] = JSON.parse(cached);
              localTicketIds = parsed.map((t) => t.id);
            }
          } catch (e) {}

          snapshot.forEach((d) => {
            const data = d.data() as SupportTicket;
            const tEmail = (data.userEmail || '').toLowerCase().trim();

            const isEmailMatch = tEmail && cleanUserEmail && (tEmail === cleanUserEmail || cleanUserEmail === 'guest@fitzaika.com' || cleanUserEmail === 'guest@taashbhatti.com');
            const isUidMatch = currentUid && data.userId === currentUid;
            const isLocalMatch = localTicketIds.includes(d.id);

            if (isEmailMatch || isUidMatch || isLocalMatch) {
              list.push({ id: d.id, ...data });
            }
          });

          // Also merge any local offline tickets created on this device that might not be in Firestore snapshot
          try {
            const cached = localStorage.getItem('fitzaika_support_tickets');
            if (cached) {
              const parsed: SupportTicket[] = JSON.parse(cached);
              parsed.forEach((t) => {
                if (!list.some((existing) => existing.id === t.id)) {
                  list.push(t);
                }
              });
            }
          } catch (e) {}

          // Sort by newest first
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setTickets(list);
          setLoading(false);
        },
        (error) => {
          console.warn("Firestore support tickets listener offline/error:", error);
          // Fallback to localStorage
          try {
            const cached = localStorage.getItem('fitzaika_support_tickets');
            if (cached) {
              const parsed: SupportTicket[] = JSON.parse(cached);
              setTickets(parsed);
            }
          } catch (e) {}
          setLoading(false);
        }
      );
    } catch (e) {
      console.error(e);
      setLoading(false);
    }

    return () => unsub();
  }, [isOpen, userEmail, cleanUserEmail]);

  // Guest follow-up reply handler
  const handleSendFollowUp = async (ticket: SupportTicket) => {
    const text = (followUpMap[ticket.id] || '').trim();
    if (!text) return;

    setIsSubmittingFollowUp((prev) => ({ ...prev, [ticket.id]: true }));

    const updatedMessage = `${ticket.message}\n\n[Guest Follow-up ${new Date().toLocaleTimeString()}]: ${text}`;
    
    try {
      const docRef = doc(db, 'support_tickets', ticket.id);
      await updateDoc(docRef, {
        message: updatedMessage,
        unreadByAdmin: true,
        unreadByCustomer: false,
        status: 'pending',
      }).catch(() => {});

      // Update local state
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticket.id
            ? { ...t, message: updatedMessage, unreadByAdmin: true, status: 'pending' }
            : t
        )
      );

      // Update local storage
      try {
        const cached = localStorage.getItem('fitzaika_support_tickets');
        if (cached) {
          const parsed: SupportTicket[] = JSON.parse(cached);
          const idx = parsed.findIndex((t) => t.id === ticket.id);
          if (idx !== -1) {
            parsed[idx] = { ...parsed[idx], message: updatedMessage, unreadByAdmin: true, status: 'pending' };
            localStorage.setItem('fitzaika_support_tickets', JSON.stringify(parsed));
          }
        }
      } catch (e) {}

      setFollowUpMap((prev) => ({ ...prev, [ticket.id]: '' }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingFollowUp((prev) => ({ ...prev, [ticket.id]: false }));
    }
  };

  // Mark ticket as read by customer
  const handleMarkAsRead = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    if (ticket.unreadByCustomer) {
      try {
        const docRef = doc(db, 'support_tickets', ticket.id);
        await updateDoc(docRef, { unreadByCustomer: false }).catch(() => {});
        // Update local state
        setTickets((prev) =>
          prev.map((t) => (t.id === ticket.id ? { ...t, unreadByCustomer: false } : t))
        );
      } catch (e) {}
    }
  };

  if (!isOpen) return null;

  // Filtered tickets logic
  const filteredTickets = tickets.filter((t) => {
    // Tab filter
    if (activeTab === 'pending' && t.status !== 'pending' && t.status !== 'under_review') return false;
    if (activeTab === 'resolved' && t.status !== 'resolved' && t.status !== 'closed') return false;
    if (activeTab === 'complaints' && t.type !== 'complaint') return false;
    if (activeTab === 'feedback' && t.type !== 'feedback') return false;
    if (activeTab === 'suggestions' && t.type !== 'suggestion') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = t.id.toLowerCase().includes(q);
      const matchSub = t.subject.toLowerCase().includes(q);
      const matchMsg = t.message.toLowerCase().includes(q);
      const matchOrder = t.orderId?.toLowerCase().includes(q);
      const matchReply = t.adminReply?.toLowerCase().includes(q);
      return matchId || matchSub || matchMsg || matchOrder || matchReply;
    }

    return true;
  });

  const unreadCount = tickets.filter((t) => t.unreadByCustomer || t.adminReply && t.status === 'resolved').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-[#0F1419] border border-brand-green/20 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white relative">
        
        {/* HEADER BAR */}
        <div className="px-5 py-4 border-b border-white/10 bg-[#12181E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-orange/20 border border-brand-orange/40 text-brand-orange flex items-center justify-center font-bold relative">
              <Mail className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  TAASH BHATTI Support Mailbox
                </h3>
                <span className="text-[9px] font-mono font-bold bg-brand-green/20 text-brand-green px-2 py-0.5 rounded-full border border-brand-green/30">
                  {tickets.length} Saved Tickets
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono truncate max-w-xs sm:max-w-md">
                Tracking messages & admin replies for: <strong className="text-brand-orange">{userEmail}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenNewTicket && (
              <button
                onClick={() => {
                  onClose();
                  onOpenNewTicket();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Query</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SEARCH & FILTER CONTROLS */}
        <div className="p-4 bg-[#151C24] border-b border-white/10 space-y-3 shrink-0">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Ticket ID, Subject, Order ID, or message text..."
              className="w-full bg-[#0B0F14] border border-white/15 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-orange font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 text-xs">
            {[
              { id: 'all', label: 'All Queries' },
              { id: 'pending', label: '⏳ Pending' },
              { id: 'resolved', label: '✓ Resolved' },
              { id: 'complaints', label: '🚨 Complaints' },
              { id: 'feedback', label: '⭐ Feedback' },
              { id: 'suggestions', label: '💡 Suggestions' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-[10px] whitespace-nowrap transition-all cursor-pointer border ${
                  activeTab === tab.id
                    ? 'bg-brand-orange text-brand-charcoal border-brand-orange font-black shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* MAIL LIST BODY */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="py-12 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-brand-orange animate-spin mx-auto" />
              <p className="text-xs font-mono text-gray-400">Loading your support inbox thread...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-white/5 border border-dashed border-white/10 rounded-3xl p-6">
              <MessageSquare className="w-10 h-10 text-gray-500 mx-auto" />
              <h4 className="text-sm font-extrabold text-white uppercase">No Support Tickets Found</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                {searchQuery || activeTab !== 'all'
                  ? 'No ticket entries match your search or filter options.'
                  : 'You have not submitted any complaints, feedback, or support queries yet.'}
              </p>
              {onOpenNewTicket && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenNewTicket();
                  }}
                  className="mt-2 px-5 py-2.5 bg-brand-orange text-brand-charcoal font-black text-xs uppercase rounded-xl hover:bg-brand-orange/90 transition-all cursor-pointer"
                >
                  Submit Your First Complaint / Query
                </button>
              )}
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const isSelected = selectedTicket?.id === ticket.id;
              const hasAdminReply = !!ticket.adminReply;

              return (
                <div
                  key={ticket.id}
                  onClick={() => handleMarkAsRead(ticket)}
                  className={`bg-[#151C24] border rounded-2xl p-4 transition-all cursor-pointer hover:border-brand-orange/50 space-y-3 relative ${
                    ticket.unreadByCustomer
                      ? 'border-brand-orange bg-brand-orange/5'
                      : isSelected
                      ? 'border-brand-green bg-[#18222E]'
                      : 'border-white/10'
                  }`}
                >
                  {/* Ticket Header Metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold bg-black/40 text-brand-orange px-2.5 py-1 rounded-lg border border-brand-orange/30">
                        {ticket.id}
                      </span>

                      {/* Type Badge */}
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                        ticket.type === 'complaint'
                          ? 'bg-red-950/80 text-red-300 border-red-500/40'
                          : ticket.type === 'feedback'
                          ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                          : ticket.type === 'suggestion'
                          ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {ticket.type}
                      </span>

                      {/* Priority Badge */}
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        ticket.priority === 'urgent'
                          ? 'bg-red-500 text-white animate-pulse'
                          : ticket.priority === 'high'
                          ? 'bg-amber-500 text-brand-charcoal'
                          : 'bg-white/10 text-gray-300'
                      }`}>
                        {ticket.priority} Priority
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status Badge */}
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border ${
                        ticket.status === 'resolved' || ticket.status === 'closed'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                          : ticket.status === 'under_review'
                          ? 'bg-blue-950 text-blue-300 border-blue-500/50'
                          : 'bg-amber-950 text-amber-300 border-amber-500/50'
                      }`}>
                        {ticket.status.replace(/_/g, ' ')}
                      </span>

                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(ticket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Subject & Details */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <span>{ticket.subject}</span>
                        {ticket.rating && (
                          <span className="flex items-center gap-0.5 text-amber-400 text-xs font-bold bg-black/30 px-2 py-0.5 rounded-md border border-amber-500/30">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {ticket.rating}/5
                          </span>
                        )}
                      </h4>

                      {ticket.orderId && (
                        <span className="text-[10px] font-mono bg-white/5 text-gray-300 px-2 py-0.5 rounded border border-white/10">
                          Order #{ticket.orderId}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-300 mt-1.5 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5 font-sans">
                      {ticket.message}
                    </p>

                    {ticket.imageUrl && (
                      <div className="mt-2 p-2 bg-black/40 rounded-xl border border-white/10">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Attached Evidence Photo:</span>
                          <span className="text-[9px] text-brand-green font-bold flex items-center gap-1 cursor-pointer hover:underline" onClick={() => setLightboxImage(ticket.imageUrl || null)}>
                            <ZoomIn className="w-3 h-3" /> Tap to Fullscreen
                          </span>
                        </div>
                        <img
                          src={ticket.imageUrl}
                          alt="Ticket attachment"
                          className="max-h-48 rounded-lg object-cover border border-white/10 hover:opacity-90 transition-all cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImage(ticket.imageUrl || null);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* OFFICIAL ADMIN RESPONSE THREAD */}
                  {hasAdminReply ? (
                    <div className="bg-emerald-950/70 border-2 border-emerald-500/50 rounded-2xl p-3.5 space-y-2 animate-fade-in shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-300 uppercase tracking-wider">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>TAASH BHATTI Official Kitchen Reply</span>
                          {ticket.adminName && (
                            <span className="text-[10px] font-normal text-emerald-400 font-mono">({ticket.adminName})</span>
                          )}
                        </div>

                        {ticket.adminRepliedAt && (
                          <span className="text-[10px] font-mono text-emerald-400/80">
                            {new Date(ticket.adminRepliedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-emerald-100 font-medium leading-relaxed bg-black/30 p-2.5 rounded-xl border border-emerald-500/30">
                        {ticket.adminReply}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-emerald-300 font-mono pt-1">
                        <span>Status: <strong className="uppercase">{ticket.status}</strong></span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Issue Addressed by Support Desk
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <span className="flex items-center gap-1.5 text-amber-300">
                        <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                        <span>Awaiting Response from Kitchen Desk</span>
                      </span>
                      <span className="text-[10px] text-gray-500">Est. reply: ~30-60 mins</span>
                    </div>
                  )}

                  {/* GUEST FOLLOW-UP REPLY INPUT */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Type follow-up message to Admin Desk..."
                        value={followUpMap[ticket.id] || ''}
                        onChange={(e) => setFollowUpMap({ ...followUpMap, [ticket.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendFollowUp(ticket);
                        }}
                        className="flex-1 bg-[#0B0F14] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendFollowUp(ticket)}
                        disabled={isSubmittingFollowUp[ticket.id] || !followUpMap[ticket.id]?.trim()}
                        className="px-3 py-1.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-extrabold text-xs rounded-xl transition-all disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send</span>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* FOOTER BAR */}
        <div className="p-4 bg-[#12181E] border-t border-white/10 flex items-center justify-between text-xs text-gray-400 shrink-0">
          <span className="font-mono text-[11px]">
            TAASH BHATTI Kitchen & Quality Assurance Desk
          </span>

          <div className="flex items-center gap-3">
            {onOpenNewTicket && (
              <button
                onClick={() => {
                  onClose();
                  onOpenNewTicket();
                }}
                className="px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 text-brand-charcoal font-black text-xs uppercase rounded-xl transition-all cursor-pointer shadow-md"
              >
                + New Complaint or Feedback
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>

      {/* FULLSCREEN IMAGE LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white bg-white/10 rounded-full transition-all cursor-pointer border-none"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="Enlarged evidence"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-xs text-gray-400 mt-3 font-mono text-center">
              Tap anywhere outside image or click X to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
