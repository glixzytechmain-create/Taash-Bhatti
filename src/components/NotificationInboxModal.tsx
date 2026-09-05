import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, ExternalLink, Sparkles, Tag, ShoppingBag, ShieldAlert, Trash2, Volume2 } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppNotification, User } from '../types';

interface NotificationInboxModalProps {
  user: User | null;
  fbUser: any;
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export default function NotificationInboxModal({
  user,
  fbUser,
  isOpen,
  onClose,
  onNavigateTab
}: NotificationInboxModalProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  // Real-time listener for broadcasts and user-targeted notifications
  useEffect(() => {
    const notifCol = collection(db, 'notifications');
    const unsubscribe = onSnapshot(notifCol, (snapshot) => {
      const loaded: AppNotification[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as AppNotification;
        const item: AppNotification = { ...data, id: docSnap.id };

        // Filter based on target audience
        const target = item.targetAudience || 'all';
        const userUid = fbUser?.uid || user?.id;
        const userEmail = fbUser?.email || user?.email;
        const userCity = user?.city?.toLowerCase();

        let matches = false;
        if (target === 'all') {
          matches = true;
        } else if (target === 'vip') {
          matches = true; // Show to logged in users
        } else if (target === 'city') {
          if (item.targetCity && userCity && userCity.includes(item.targetCity.toLowerCase())) {
            matches = true;
          } else if (!item.targetCity) {
            matches = true;
          }
        } else if (target === 'selected_users') {
          if (item.targetUserIds && (userUid || userEmail)) {
            if (item.targetUserIds.includes(userUid) || item.targetUserIds.includes(userEmail)) {
              matches = true;
            }
          }
        } else if (target === 'no_permissions') {
          matches = true;
        }

        if (matches) {
          loaded.push(item);
        }
      });

      // Sort newest first
      loaded.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      setNotifications(loaded);
    }, (error) => {
      console.error("Error listening to notifications:", error);
    });

    return () => unsubscribe();
  }, [fbUser, user]);

  // Mark single notification as read
  const handleMarkAsRead = async (notif: AppNotification) => {
    const userIdOrEmail = fbUser?.uid || fbUser?.email || user?.id || user?.email || 'guest';
    const currentReadBy = notif.readBy || [];
    if (!currentReadBy.includes(userIdOrEmail)) {
      const updatedReadBy = [...currentReadBy, userIdOrEmail];
      try {
        await updateDoc(doc(db, 'notifications', notif.id), {
          readBy: updatedReadBy
        });
      } catch (err) {
        console.warn("Error marking notification read:", err);
      }
    }
  };

  // Mark ALL as read
  const handleMarkAllAsRead = async () => {
    const userIdOrEmail = fbUser?.uid || fbUser?.email || user?.id || user?.email || 'guest';
    for (const notif of notifications) {
      const currentReadBy = notif.readBy || [];
      if (!currentReadBy.includes(userIdOrEmail)) {
        try {
          await updateDoc(doc(db, 'notifications', notif.id), {
            readBy: [...currentReadBy, userIdOrEmail]
          });
        } catch (err) {
          console.warn("Error marking notification read:", err);
        }
      }
    }
  };

  const isRead = (notif: AppNotification) => {
    const userIdOrEmail = fbUser?.uid || fbUser?.email || user?.id || user?.email || 'guest';
    return notif.readBy && notif.readBy.includes(userIdOrEmail);
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeCategoryFilter === 'all') return true;
    return n.category === activeCategoryFilter;
  });

  const unreadCount = notifications.filter(n => !isRead(n)).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 15 }}
          className="relative bg-[#0F141A] border border-white/10 rounded-3xl w-full max-w-lg h-[80vh] flex flex-col shadow-2xl z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#141B24]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-orange/20 text-brand-orange rounded-xl flex items-center justify-center border border-brand-orange/30">
                <Bell className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  Notifications Inbox
                  {unreadCount > 0 && (
                    <span className="bg-brand-orange text-brand-charcoal text-[10px] font-black px-2 py-0.5 rounded-full">
                      {unreadCount} NEW
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-400">Promos, Order Updates & Chef Alerts</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-brand-orange text-[10px] font-bold uppercase rounded-lg border border-brand-orange/30 transition-all cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-all border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="p-3 bg-[#0A0D12] border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Alerts' },
              { id: 'promo', label: '🔥 Promos' },
              { id: 'order_update', label: '📦 Orders' },
              { id: 'chef_special', label: '🥗 Chef Specials' },
              { id: 'system', label: '⚙️ System' },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all border cursor-pointer ${
                  activeCategoryFilter === cat.id
                    ? 'bg-brand-orange text-brand-charcoal border-brand-orange font-black shadow-md'
                    : 'bg-[#141B24] text-gray-400 border-white/5 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center text-gray-500 border border-white/5">
                  <Bell className="w-8 h-8 opacity-40" />
                </div>
                <h4 className="text-sm font-bold text-gray-300 uppercase">No Notifications Found</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  You're all caught up! New promotions, order updates, and chef announcements will appear here.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif, notifIdx) => {
                const read = isRead(notif);
                return (
                  <motion.div
                    key={`notif-${notif.id || notifIdx}-${notifIdx}`}
                    layout
                    onClick={() => handleMarkAsRead(notif)}
                    className={`relative p-4 rounded-2xl border transition-all cursor-pointer ${
                      read
                        ? 'bg-[#121820]/60 border-white/5 text-gray-400 opacity-80'
                        : 'bg-[#18222F] border-brand-orange/40 text-white shadow-lg ring-1 ring-brand-orange/20'
                    }`}
                  >
                    {!read && (
                      <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-brand-orange rounded-full animate-ping" />
                    )}

                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        notif.category === 'promo' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        notif.category === 'order_update' ? 'bg-brand-green/20 text-brand-green border border-brand-green/30' :
                        notif.category === 'chef_special' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {notif.category === 'promo' ? <Tag className="w-5 h-5" /> :
                         notif.category === 'order_update' ? <ShoppingBag className="w-5 h-5" /> :
                         notif.category === 'chef_special' ? <Sparkles className="w-5 h-5" /> :
                         <Bell className="w-5 h-5" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white/10 text-gray-300">
                            {notif.category?.replace('_', ' ') || 'Notice'}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            {notif.sentAt ? new Date(notif.sentAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white mt-1 leading-snug">
                          {notif.title}
                        </h4>

                        <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                          {notif.body}
                        </p>

                        {/* Banner Image if attached */}
                        {notif.imageUrl && (
                          <div className="mt-2.5 rounded-xl overflow-hidden border border-white/10 max-h-36">
                            <img src={notif.imageUrl} alt={notif.title} className="w-full h-full object-cover" />
                          </div>
                        )}

                        {/* Link Button */}
                        {notif.linkUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notif);
                              if (notif.linkUrl?.startsWith('http://') || notif.linkUrl?.startsWith('https://')) {
                                window.open(notif.linkUrl, '_blank', 'noopener,noreferrer');
                              } else if (onNavigateTab && notif.linkUrl) {
                                onNavigateTab(notif.linkUrl);
                                onClose();
                              }
                            }}
                            className="mt-3 px-3.5 py-2 bg-gradient-to-r from-brand-orange to-amber-500 hover:from-brand-orange/90 hover:to-amber-600 text-brand-charcoal text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer border-none"
                          >
                            {notif.buttonText || (
                              notif.category === 'promo' ? 'CLAIM OFFER ➜' :
                              notif.category === 'order_update' ? 'TRACK NOW ➜' :
                              notif.category === 'chef_special' ? 'WITNESS ➜' :
                              notif.category === 'event' ? 'PARTICIPATE ➜' :
                              notif.category === 'system' ? 'TAKE ACTION ➜' :
                              'VIEW DETAILS ➜'
                            )}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
