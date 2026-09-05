/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  Bell,
  X,
  Flame,
  Bike,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Order, User } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SmartNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'wallet' | 'support' | 'system';
  timestamp: string;
  read?: boolean;
  orderId?: string;
  icon?: 'flame' | 'bike' | 'sparkles' | 'phone';
}

interface SmartNotificationEngineProps {
  user: User;
  onOpenOrderTracking?: (orderId: string) => void;
  onOpenWallet?: () => void;
}

export const SmartNotificationEngine: React.FC<SmartNotificationEngineProps> = ({
  user,
  onOpenOrderTracking,
  onOpenWallet,
}) => {
  const [notifications, setNotifications] = useState<SmartNotification[]>(() => {
    try {
      const cached = localStorage.getItem(`taash_notifications_${user.id || 'guest'}`);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  const [activeToast, setActiveToast] = useState<SmartNotification | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const previousOrderStatusRef = useRef<Record<string, string>>({});
  const audioContextRef = useRef<AudioContext | null>(null);

  // Synthesized chime using browser Web Audio API (Zero external mp3 dependencies)
  const playChime = (type: 'order' | 'wallet' | 'urgent') => {
    try {
      const ctx = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (type === 'wallet') {
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      } else if (type === 'urgent') {
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
      } else {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5
      }

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      // Audio playback restrictions fallback
    }
  };

  const addNotification = (notif: Omit<SmartNotification, 'id' | 'timestamp' | 'read'>) => {
    const newEntry: SmartNotification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };

    setNotifications(prev => {
      const updated = [newEntry, ...prev.slice(0, 19)];
      try {
        localStorage.setItem(`taash_notifications_${user.id || 'guest'}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setActiveToast(newEntry);
    playChime(notif.type === 'wallet' ? 'wallet' : notif.type === 'support' ? 'urgent' : 'order');

    // System Push notification if granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(newEntry.title, {
          body: newEntry.message,
          icon: '/favicon.ico'
        });
      } catch (e) {}
    }

    // Auto-dismiss floating toast after 5.5s
    setTimeout(() => {
      setActiveToast(current => (current?.id === newEntry.id ? null : current));
    }, 5500);
  };

  // 1. Real-time Listener for User's Active Orders
  useEffect(() => {
    if (!user.id) return;

    try {
      const ordersQ = query(
        collection(db, 'orders'),
        where('userId', '==', user.id)
      );

      const unsubscribe = onSnapshot(ordersQ, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const order = { id: change.doc.id, ...change.doc.data() } as Order;
          const prevStatus = previousOrderStatusRef.current[order.id];

          if (change.type === 'modified' && prevStatus && prevStatus !== order.status) {
            if (order.status === 'cooking') {
              addNotification({
                title: '🔥 Clay Oven In Action!',
                message: `Order #${order.id.slice(-4)} is now being prepared fresh in the bhatti.`,
                type: 'order',
                orderId: order.id,
                icon: 'flame'
              });
            } else if (order.status === 'ready_for_pickup') {
              addNotification({
                title: '✨ Plated & Packed!',
                message: `Order #${order.id.slice(-4)} is packed warm. Proximity courier assigned.`,
                type: 'order',
                orderId: order.id,
                icon: 'bike'
              });
            } else if (order.status === 'out_for_delivery') {
              addNotification({
                title: '⚡ On The Way!',
                message: `Courier ${order.deliveryPartnerName || 'Rider'} is heading your way in thermal gear.`,
                type: 'order',
                orderId: order.id,
                icon: 'bike'
              });
            } else if (order.status === 'delivered') {
              addNotification({
                title: '🎉 Order Delivered!',
                message: `Order #${order.id.slice(-4)} delivered! +10% Standard Embers added to Bhatti Wallet.`,
                type: 'order',
                orderId: order.id,
                icon: 'sparkles'
              });
            }
          }

          previousOrderStatusRef.current[order.id] = order.status;
        });
      });

      return () => unsubscribe();
    } catch (e) {}
  }, [user.id]);

  // Request notification permission smoothly
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const handleFirstClick = () => {
        try {
          Notification.requestPermission();
        } catch (e) {}
        window.removeEventListener('click', handleFirstClick);
      };
      window.addEventListener('click', handleFirstClick, { once: true });
      return () => window.removeEventListener('click', handleFirstClick);
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      try {
        localStorage.setItem(`taash_notifications_${user.id || 'guest'}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  return (
    <>
      {/* 1. FLOATING TOAST ALERT */}
      {activeToast && (
        <div className="fixed top-4 right-4 z-[9990] max-w-sm w-[calc(100vw-2rem)] bg-[#0C1017] text-white border border-amber-500/40 rounded-2xl shadow-2xl p-3.5 animate-slide-in backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              {activeToast.icon === 'flame' ? (
                <Flame className="w-4 h-4" />
              ) : activeToast.icon === 'bike' ? (
                <Bike className="w-4 h-4" />
              ) : activeToast.icon === 'phone' ? (
                <PhoneCall className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-black text-white">{activeToast.title}</h5>
                <span className="text-[9px] text-gray-400 font-mono">{activeToast.timestamp}</span>
              </div>
              <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed">{activeToast.message}</p>

              {activeToast.orderId && onOpenOrderTracking && (
                <button
                  onClick={() => {
                    onOpenOrderTracking(activeToast.orderId!);
                    setActiveToast(null);
                  }}
                  className="mt-2 text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Track Live Order</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={() => setActiveToast(null)}
              className="text-gray-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. PERSISTENT NOTIFICATION DRAWER / MODAL */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#0f172a] text-white border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-white">Smart Notifications</h4>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[9px] font-black">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                  >
                    Mark All Read
                  </button>
                )}
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 custom-scrollbar text-xs">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Bell className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">No notifications yet</p>
                  <p className="text-[10px] text-slate-500">Live order status and wallet alerts will appear here.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      n.read
                        ? 'bg-slate-800/40 border-slate-700/50 text-slate-300'
                        : 'bg-amber-950/20 border-amber-500/40 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-amber-300">{n.title}</span>
                      <span className="text-[9px] font-mono text-slate-400">{n.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">{n.message}</p>
                    {n.orderId && onOpenOrderTracking && (
                      <button
                        onClick={() => {
                          onOpenOrderTracking(n.orderId!);
                          setIsDrawerOpen(false);
                        }}
                        className="mt-2 text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Order</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
