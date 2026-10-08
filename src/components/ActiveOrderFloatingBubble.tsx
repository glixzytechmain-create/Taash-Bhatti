/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Bike, 
  Clock, 
  ArrowRight, 
  ChefHat, 
  CheckCircle2, 
  Radio, 
  ChevronUp, 
  ChevronDown,
  Navigation,
  Sparkles
} from 'lucide-react';
import { Order } from '../types';

interface ActiveOrderFloatingBubbleProps {
  order: Order | null;
  onTrackOrder: (orderId: string) => void;
}

export const ActiveOrderFloatingBubble: React.FC<ActiveOrderFloatingBubbleProps> = ({
  order,
  onTrackOrder
}) => {
  const [liveEta, setLiveEta] = useState<string>(() => {
    return order?.liveEta || localStorage.getItem('taashbhatti_active_order_eta') || '12-15 Mins';
  });
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Sync ETA whenever order updates or Google Maps Directions broadcasts updated ETA
  useEffect(() => {
    if (order?.liveEta) {
      setLiveEta(order.liveEta);
    }
  }, [order?.liveEta]);

  useEffect(() => {
    const handleEtaUpdate = (e: any) => {
      if (e?.detail?.eta) {
        if (!order || !e.detail.orderId || e.detail.orderId === order.id) {
          setLiveEta(e.detail.eta);
        }
      }
    };
    window.addEventListener('taashbhatti_order_eta_updated', handleEtaUpdate);
    return () => window.removeEventListener('taashbhatti_order_eta_updated', handleEtaUpdate);
  }, [order?.id]);

  if (!order || order.status === 'delivered' || order.status === 'cancelled') {
    return null;
  }

  // Calculate milestone progress percentage
  const getProgressDetails = () => {
    switch (order.status) {
      case 'sent':
        return {
          percent: 25,
          label: 'Order Transmitted',
          subtext: 'Awaiting Kitchen Acceptance',
          icon: <Radio className="w-4 h-4 text-amber-400 animate-pulse" />,
          color: 'from-amber-500 to-amber-600'
        };
      case 'cooking':
      case 'preparing':
        return {
          percent: 50,
          label: `Cooking at ${order.acceptedKitchenName || order.kitchenName || 'Central Bhatti'}`,
          subtext: 'Fresh clay-oven preparation underway',
          icon: <Flame className="w-4 h-4 text-[#C06C38] animate-bounce" />,
          color: 'from-[#C06C38] to-[#994F22]'
        };
      case 'ready':
      case 'ready_for_pickup':
        return {
          percent: 70,
          label: 'Plated & Thermal Packed',
          subtext: 'Waiting for courier pickup',
          icon: <ChefHat className="w-4 h-4 text-emerald-400" />,
          color: 'from-emerald-500 to-teal-600'
        };
      case 'out_for_delivery':
        return {
          percent: 85,
          label: `On the Way • ${order.deliveryPartnerName || 'Rider Partner'}`,
          subtext: 'Navigating towards your doorstep',
          icon: <Bike className="w-4 h-4 text-emerald-400 animate-pulse" />,
          color: 'from-emerald-500 to-emerald-600'
        };
      default:
        return {
          percent: 35,
          label: 'Order in Progress',
          subtext: 'Processing your gourmet meal',
          icon: <Sparkles className="w-4 h-4 text-amber-400" />,
          color: 'from-[#C06C38] to-emerald-600'
        };
    }
  };

  const details = getProgressDetails();

  return (
    <div className="fixed bottom-20 sm:bottom-24 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-40 pointer-events-auto">
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-[#0C130F]/95 backdrop-blur-md border border-[#C06C38]/60 rounded-2xl sm:rounded-3xl shadow-2xl p-3.5 text-white overflow-hidden shadow-black/80"
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2">
          <div 
            onClick={() => onTrackOrder(order.id)}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#143D27] to-[#0C130F] border border-[#C06C38]/40 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              {details.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono font-black text-[#E89358] uppercase tracking-wider">
                  #{order.id.slice(-6).toUpperCase()}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Order
                </span>
              </div>
              <h4 className="text-xs font-black text-white truncate group-hover:text-[#E89358] transition-colors">
                {details.label}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick ETA Badge */}
            <div className="flex items-center gap-1 bg-[#143D27]/80 border border-emerald-500/30 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold text-emerald-300 shadow-xs">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>{liveEta}</span>
            </div>

            {/* Toggle minimize / expand */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={isMinimized ? "Expand" : "Collapse"}
            >
              {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expandable Body */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2.5 pt-2.5 overflow-hidden"
            >
              {/* Milestone Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-zinc-300">
                  <span className="truncate">{details.subtext}</span>
                  <span className="font-mono font-bold text-[#E89358] shrink-0 ml-2">{details.percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                  <div 
                    className="h-full bg-gradient-to-r from-[#C06C38] via-amber-400 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${details.percent}%` }}
                  />
                </div>
              </div>

              {/* 1-Tap Track Action */}
              <button
                type="button"
                onClick={() => onTrackOrder(order.id)}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#C06C38] to-[#994F22] hover:brightness-110 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-[0.99]"
              >
                <span>Track Live on Radar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ActiveOrderFloatingBubble;
