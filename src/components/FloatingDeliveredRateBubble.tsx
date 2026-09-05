/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X, Sparkles, ChevronRight, CheckCircle } from 'lucide-react';
import { Order } from '../types';

interface FloatingDeliveredRateBubbleProps {
  order: Order | null;
  onOpenRatingModal: (order: Order) => void;
  onDismiss?: (orderId: string) => void;
}

export default function FloatingDeliveredRateBubble({
  order,
  onOpenRatingModal,
  onDismiss,
}: FloatingDeliveredRateBubbleProps) {
  const [dismissedOrderIds, setDismissedOrderIds] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem('fitzaika_dismissed_rate_bubbles');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  if (!order || order.status !== 'delivered' || order.deliveryRating || dismissedOrderIds.includes(order.id)) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...dismissedOrderIds, order.id];
    setDismissedOrderIds(updated);
    try {
      sessionStorage.setItem('fitzaika_dismissed_rate_bubbles', JSON.stringify(updated));
    } catch {}
    if (onDismiss) onDismiss(order.id);
  };

  const firstItemName = order.items[0]?.meal?.name || 'Your Delicious Meal';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -50, scale: 0.85 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -50, scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="fixed top-20 left-3 sm:left-6 z-40 max-w-[calc(100vw-24px)] sm:max-w-sm pointer-events-auto"
        id="floating-delivered-rate-bubble"
      >
        <div
          onClick={() => onOpenRatingModal(order)}
          className="group bg-gradient-to-r from-[#101720]/95 via-[#19222c]/95 to-[#101720]/95 backdrop-blur-md border-2 border-amber-500/50 hover:border-amber-400 rounded-2xl p-3 shadow-2xl shadow-amber-500/15 cursor-pointer transition-all duration-300 hover:scale-[1.02] flex items-center gap-3 relative overflow-hidden"
        >
          {/* Glowing Animated Accent Strip */}
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-amber-500 to-emerald-400" />

          {/* Left Pulsing Icon Badge */}
          <div className="relative shrink-0 ml-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-black font-black flex items-center justify-center shadow-md relative z-10">
              <Star className="w-5 h-5 fill-black text-black animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          </div>

          {/* Center Info Text */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                Delivered Just Now!
              </span>
              <span className="text-[9px] text-gray-400 font-mono">#{order.id.slice(-6)}</span>
            </div>

            <h4 className="text-xs font-black text-white leading-tight mt-1 truncate">
              Rate & Review Order
            </h4>
            <p className="text-[10px] text-gray-300 truncate font-mono mt-0.5">
              {firstItemName}
            </p>
          </div>

          {/* Right Action & Dismiss */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-black text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center">
              Rate <ChevronRight className="w-3.5 h-3.5" />
            </span>

            <button
              type="button"
              onClick={handleDismiss}
              title="Dismiss for now"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
