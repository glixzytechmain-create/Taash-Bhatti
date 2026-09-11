/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Users, Navigation, X, Flame } from 'lucide-react';
import { GroupOrderRoom, Order } from '../types';

interface GroupOrderFloatingBubbleProps {
  activeRoom: GroupOrderRoom | null;
  placedGroupOrder: Order | null;
  isRoomModalOpen: boolean;
  onOpenRoom: () => void;
  onTrackOrder: (orderId: string) => void;
}

export default function GroupOrderFloatingBubble({
  activeRoom,
  placedGroupOrder,
  isRoomModalOpen,
  onOpenRoom,
  onTrackOrder,
}: GroupOrderFloatingBubbleProps) {
  const [dismissedOrderId, setDismissedOrderId] = useState<string | null>(null);

  // Auto reset dismissal if a new order arrives
  useEffect(() => {
    if (placedGroupOrder && placedGroupOrder.id !== dismissedOrderId) {
      setDismissedOrderId(null);
    }
  }, [placedGroupOrder?.id]);

  // If order is placed: show bigger bubble at bottom-left just above bottom nav bar
  const showPlacedOrderBubble =
    Boolean(placedGroupOrder) &&
    placedGroupOrder?.status !== 'delivered' &&
    placedGroupOrder?.status !== 'cancelled' &&
    dismissedOrderId !== placedGroupOrder?.id;

  // Pre-order active room bubble: show floating bubble on screen when room is active & modal closed
  const showPreOrderBubble =
    Boolean(activeRoom) &&
    activeRoom?.status !== 'ordered' &&
    activeRoom?.status !== 'disbanded' &&
    !isRoomModalOpen &&
    !showPlacedOrderBubble;

  // If neither condition is met, render nothing
  if (!showPlacedOrderBubble && !showPreOrderBubble) {
    return null;
  }

  return (
    <>
      {/* 1. PLACED GROUP ORDER BUBBLE: Bigger width, with two distinct buttons: Track & Enter */}
      {showPlacedOrderBubble && placedGroupOrder && (
        <aside
          id="placed-group-order-tracking-bubble"
          aria-label="Active Feast Room Order"
          className="fixed bottom-20 sm:bottom-22 left-3 sm:left-6 z-40 w-[340px] sm:w-[410px] max-w-[calc(100vw-24px)] pointer-events-auto"
        >
          <div className="relative bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 text-white border-2 border-brand-orange/90 rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 shadow-2xl shadow-orange-950/70 flex items-center justify-between gap-3">
            {/* Left side: Status & Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex h-3.5 w-3.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black uppercase text-amber-300 tracking-wider truncate">
                    Feast #{placedGroupOrder.id.slice(-6)}
                  </span>
                  {activeRoom?.code && (
                    <span className="text-[9px] font-mono font-extrabold bg-stone-800 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                      {activeRoom.code}
                    </span>
                  )}
                  <span className="text-[8px] bg-emerald-500/20 text-emerald-300 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Active
                  </span>
                </div>
                <p className="text-[10px] text-stone-300 font-semibold truncate leading-tight mt-0.5">
                  {placedGroupOrder.status === 'prepared' || placedGroupOrder.status === 'ready_for_pickup'
                    ? 'Bhatti Cooking 🔥'
                    : placedGroupOrder.status === 'out_for_delivery'
                    ? 'Rider On Road 🛵'
                    : 'Kitchen Preparing Food 🔥'}
                </p>
              </div>
            </div>

            {/* Right side: TWO BUTTONS (Track & Enter) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Button 1: Track */}
              <button
                type="button"
                id="group-order-bubble-track-btn"
                onClick={() => onTrackOrder(placedGroupOrder.id)}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-[11px] uppercase tracking-wider rounded-xl shadow-md flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                title="Track Live Delivery"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Track</span>
              </button>

              {/* Button 2: Enter */}
              <button
                type="button"
                id="group-order-bubble-enter-btn"
                onClick={onOpenRoom}
                className="px-3 py-1.5 bg-stone-800/90 hover:bg-stone-700 text-white hover:text-amber-300 border border-stone-700 hover:border-brand-orange font-black text-[11px] uppercase tracking-wider rounded-xl shadow-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                title="Enter Feast Room"
              >
                <Users className="w-3.5 h-3.5 text-brand-orange" />
                <span>Enter</span>
              </button>
            </div>

            {/* Quick dismiss button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDismissedOrderId(placedGroupOrder.id);
              }}
              title="Hide tracking bubble"
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-stone-900 border border-stone-700 hover:bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center text-[10px] shadow-sm cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </aside>
      )}

      {/* 2. PRE-ORDER ACTIVE ROOM BUBBLE: Floating bubble when room is in preparation */}
      {showPreOrderBubble && activeRoom && (
        <aside
          id="active-group-order-room-bubble"
          aria-label="Active Feast Room"
          className="fixed bottom-20 sm:bottom-22 left-3 sm:left-6 z-40 w-[320px] sm:w-[380px] max-w-[calc(100vw-24px)] pointer-events-auto"
        >
          <div className="relative bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 text-white border-2 border-brand-orange/90 rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 shadow-2xl shadow-orange-950/70 flex items-center justify-between gap-3">
            {/* Left side: Room info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-orange to-amber-500 text-stone-950 flex items-center justify-center font-black shadow-md shrink-0">
                <Flame className="w-4 h-4 text-stone-950" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black uppercase text-white tracking-wider truncate">
                    Taash Dawat
                  </span>
                  <span className="text-[9px] font-mono font-bold text-amber-300 bg-black/50 px-1.5 py-0.5 rounded border border-amber-500/30">
                    {activeRoom.code}
                  </span>
                </div>
                <p className="text-[10px] text-stone-300 font-medium truncate mt-0.5">
                  {Object.keys(activeRoom.members || {}).length} members • {activeRoom.items?.length || 0} items in cart
                </p>
              </div>
            </div>

            {/* Right side: Enter button */}
            <button
              type="button"
              id="pre-order-bubble-enter-btn"
              onClick={onOpenRoom}
              className="px-3.5 py-1.5 bg-gradient-to-r from-brand-orange to-amber-500 hover:from-orange-500 hover:to-amber-400 text-stone-950 font-black text-[11px] uppercase tracking-wider rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0"
            >
              <Users className="w-3.5 h-3.5 text-stone-950" />
              <span>Enter</span>
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
