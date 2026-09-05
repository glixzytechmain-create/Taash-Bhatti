/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Home, Utensils, Tag, Sparkles, PartyPopper, User, MapPin, Layers } from 'lucide-react';
import { getStoredFeatureFlags, subscribeFeatureFlags } from '../lib/featureFlags';
import { AppFeatureFlags } from '../types';

export type TabType = 'home' | 'menu' | 'deals' | 'deck' | 'catering' | 'coach' | 'account' | 'gyms';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export default function BottomNav({ activeTab, onChangeTab }: BottomNavProps) {
  const [tappedTab, setTappedTab] = useState<TabType | null>(null);
  const [featureFlags, setFeatureFlags] = useState<AppFeatureFlags>(getStoredFeatureFlags);

  useEffect(() => {
    const unsubscribe = subscribeFeatureFlags((flags) => {
      setFeatureFlags(flags);
    });
    return () => unsubscribe();
  }, []);

  const navItems = [
    { 
      id: 'home' as TabType, 
      label: 'Home', 
      icon: Home,
      tapRotate: [0, -8, 6, 0],
    },
    { 
      id: 'menu' as TabType, 
      label: 'Menu', 
      icon: Utensils,
      tapRotate: [0, 12, -8, 0],
    },
    { 
      id: 'deals' as TabType, 
      label: 'Deals', 
      icon: Tag,
      isDeals: true,
      tapRotate: [0, -10, 8, 0],
    },
    {
      id: 'coach' as TabType,
      label: 'AI Chef',
      icon: Sparkles,
      isAI: true,
      tapRotate: [0, 30, -15, 0],
    },
    { 
      id: 'catering' as TabType, 
      label: 'Catering', 
      icon: PartyPopper,
      tapRotate: [0, -14, 10, 0],
    },
    { 
      id: 'deck' as TabType, 
      label: 'My Deck', 
      icon: Layers,
      tapRotate: [0, -10, 10, 0],
    },
    { 
      id: 'gyms' as TabType, 
      label: 'Kitchens', 
      icon: MapPin,
      tapRotate: [0, 10, -10, 0],
    },
    { 
      id: 'account' as TabType, 
      label: 'Account', 
      icon: User,
      tapRotate: [0, 8, -6, 0],
    },
  ].filter((item) => !featureFlags.tabDisables?.[item.id]);

  const handleTabClick = (tabId: TabType) => {
    setTappedTab(tabId);
    onChangeTab(tabId);
    setTimeout(() => setTappedTab(null), 400);
  };

  return (
    <nav className="fixed bottom-0 sm:bottom-4 left-0 right-0 sm:left-1/2 sm:-translate-x-1/2 z-40 bg-white/95 backdrop-blur-xl border-t sm:border border-stone-200/90 pb-safe-bottom sm:pb-0 sm:rounded-3xl w-full sm:max-w-xl shadow-[0_12px_40px_rgba(0,0,0,0.1)] transition-all">
      <div className="w-full px-1.5 sm:px-3 py-1.5 sm:py-2 flex items-center justify-around relative">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          const isJustTapped = tappedTab === item.id;

          return (
            <motion.button
              key={item.id}
              id={`bottom-nav-${item.id}`}
              onClick={() => handleTabClick(item.id)}
              whileHover={{ scale: 1.08, y: -2 }}
              whileTap={{ scale: 0.82, y: 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="relative flex flex-col items-center justify-center py-1.5 px-1.5 sm:px-2 rounded-2xl focus:outline-none cursor-pointer select-none group min-w-[50px] sm:min-w-[58px]"
            >
              {/* Active Background Pill with layout animation */}
              {isActive && (
                <motion.div
                  layoutId="activeNavBackground"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className={`absolute inset-0 rounded-2xl ${
                    item.isAI
                      ? 'bg-emerald-500/10 border border-emerald-500/30 shadow-xs'
                      : item.isDeals
                      ? 'bg-amber-500/12 border border-amber-400/40 shadow-xs'
                      : 'bg-stone-100/90 border border-stone-200/80 shadow-xs'
                  }`}
                />
              )}

              {/* Icon Container with playful spring micro-animation */}
              <div className="relative z-10 flex items-center justify-center">
                <motion.div
                  animate={
                    isJustTapped || isActive
                      ? { 
                          scale: [1, 1.25, 0.95, 1], 
                          rotate: item.tapRotate || [0, -6, 4, 0],
                          y: [0, -3, 0]
                        }
                      : { scale: 1, rotate: 0, y: 0 }
                  }
                  transition={{ duration: 0.38, ease: 'easeOut' }}
                  className="relative flex items-center justify-center"
                >
                  <IconComponent
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isActive
                        ? item.isAI
                          ? 'text-emerald-700 stroke-[2.4px]'
                          : item.isDeals
                          ? 'text-amber-700 stroke-[2.4px]'
                          : 'text-brand-green stroke-[2.4px]'
                        : item.isAI
                        ? 'text-emerald-600/75 group-hover:text-emerald-700'
                        : item.isDeals
                        ? 'text-amber-600/75 group-hover:text-amber-700'
                        : 'text-stone-400 group-hover:text-stone-700'
                    }`}
                  />
                </motion.div>

                {/* Sophisticated Deals Micro-Accent Dot */}
                {item.isDeals && (
                  <span className={`absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full ring-1 ring-white ${
                    isActive ? 'bg-amber-500 shadow-xs' : 'bg-amber-400/80'
                  }`} />
                )}

                {/* Tasteful AI Sparkle indicator dot (no huge aura) */}
                {item.isAI && (
                  <motion.span
                    animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                    className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white shadow-xs"
                  />
                )}
              </div>

              {/* Label */}
              <span
                className={`relative z-10 text-[10px] font-semibold mt-0.5 tracking-tight transition-colors duration-200 ${
                  isActive
                    ? item.isAI
                      ? 'text-emerald-800 font-black'
                      : item.isDeals
                      ? 'text-amber-800 font-black'
                      : 'text-brand-green font-bold'
                    : item.isAI
                    ? 'text-emerald-700/80 font-medium'
                    : item.isDeals
                    ? 'text-amber-700/80 font-medium'
                    : 'text-stone-500 group-hover:text-stone-700'
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

