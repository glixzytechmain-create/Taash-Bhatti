/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MapPin, ShoppingBag, Mail, Bell, Sparkles } from 'lucide-react';
import { getStoredFeatureFlags, subscribeFeatureFlags } from '../lib/featureFlags';
import { AppFeatureFlags } from '../types';

interface HeaderProps {
  selectedGym?: any;
  onOpenGymSelector?: () => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenDeals?: () => void;
  onOpenDeck?: () => void;
  deckCount?: number;
  onOpenMailbox?: () => void;
  unreadMailCount?: number;
  onOpenNotifications?: () => void;
  unreadNotificationCount?: number;
  onOpenLocationSelector?: () => void;
  currentAddress?: string;
}

export default function Header({
  cartCount,
  onOpenCart,
  onOpenDeals,
  onOpenDeck,
  deckCount = 0,
  onOpenMailbox,
  unreadMailCount = 0,
  onOpenNotifications,
  unreadNotificationCount = 0,
  onOpenLocationSelector,
  currentAddress,
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [featureFlags, setFeatureFlags] = useState<AppFeatureFlags>(getStoredFeatureFlags);

  useEffect(() => {
    const unsubscribe = subscribeFeatureFlags((flags) => {
      setFeatureFlags(flags);
    });
    return () => unsubscribe();
  }, []);

  const headerFlags = featureFlags.headerComponents || {
    logo: true,
    location: true,
    deck: true,
    notifications: true,
    mailbox: true,
    cart: true,
    progressBar: true,
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 15);

      // Compute page scroll percentage
      const totalDocHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalDocHeight > 0) {
        const progress = Math.min(100, Math.max(0, (currentScrollY / totalDocHeight) * 100));
        setScrollProgress(progress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        isScrolled
          ? 'py-1.5 sm:py-2.5 px-2 sm:px-4'
          : 'py-2.5 sm:py-3.5 px-3 sm:px-6 bg-brand-cream/95 backdrop-blur-md border-b border-brand-green/10 shadow-xs'
      }`}
    >
      <div
        className={`max-w-6xl mx-auto flex items-center justify-between transition-all duration-300 ${
          isScrolled
            ? 'px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl sm:rounded-3xl bg-white/90 sm:bg-brand-cream/85 backdrop-blur-xl border border-brand-green/20 shadow-xl shadow-brand-charcoal/8 ring-1 ring-amber-400/20'
            : 'w-full'
        }`}
      >
        {/* Brand logo & title */}
        {headerFlags.logo !== false && (
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div
              className={`rounded-xl bg-white border border-brand-green/20 flex items-center justify-center p-0.5 shadow-md overflow-hidden shrink-0 transition-all duration-300 ${
                isScrolled ? 'w-8 h-8 sm:w-9 sm:h-9 scale-95' : 'w-9 h-9 sm:w-10 sm:h-10'
              }`}
            >
              <img
                src="https://cdn.postimage.me/2026/08/01/28172.png"
                alt="TAASH BHATTI Logo"
                className="w-full h-full object-contain rounded-lg group-hover:rotate-6 transition-transform"
                id="logo-icon"
              />
            </div>
            <div>
              <h1
                className={`font-extrabold tracking-tight flex items-center gap-1 transition-all duration-300 ${
                  isScrolled ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
                }`}
              >
                <span className="text-brand-green">TAASH</span>
                <span className="text-brand-orange">BHATTI</span>
                {isScrolled && (
                  <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400 animate-pulse hidden sm:inline" />
                )}
              </h1>
              <p
                className={`text-[8px] sm:text-[9px] text-brand-green/70 font-semibold tracking-wider uppercase -mt-0.5 transition-all duration-300 ${
                  isScrolled ? 'hidden xs:block opacity-90' : 'block'
                }`}
              >
                Gourmet Fresh Kitchen
              </p>
            </div>
          </div>
        )}

        {/* Right Action Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Location Badge */}
          {headerFlags.location !== false && (
            <button
              type="button"
              id="header-location-badge"
              onClick={onOpenLocationSelector}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isScrolled
                  ? 'bg-brand-green/15 hover:bg-brand-green/25 border-brand-green/30 text-brand-green'
                  : 'bg-brand-green/10 hover:bg-brand-green/20 border-brand-green/20 text-brand-green'
              }`}
            >
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand-orange animate-bounce" />
              <span className="max-w-[85px] xs:max-w-[120px] sm:max-w-[200px] truncate">
                {currentAddress || 'Muzaffarpur Hub'}
              </span>
            </button>
          )}

          {/* My Deck Button */}
          {headerFlags.deck !== false && onOpenDeck && (
            <button
              id="header-deck-btn"
              onClick={onOpenDeck}
              title="My Deck (Favorite Meals)"
              className={`relative px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border text-amber-900 transition-all shadow-xs cursor-pointer flex items-center gap-1 group active:scale-95 ${
                deckCount > 0
                  ? 'bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border-amber-400/80 shadow-amber-500/10'
                  : 'bg-amber-50/80 hover:bg-amber-100 border-amber-300/50'
              }`}
            >
              <span className="text-sm group-hover:rotate-12 transition-transform">🃏</span>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider hidden md:inline text-amber-950">
                My Deck
              </span>
              {deckCount > 0 ? (
                <span className="min-w-4 h-4 px-1 bg-brand-charcoal text-amber-300 font-black rounded-full text-[9px] flex items-center justify-center border border-amber-400/60 shadow-xs animate-pulse">
                  {deckCount}
                </span>
              ) : (
                <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-amber-400/60" />
              )}
            </button>
          )}

          {/* Notification Inbox Button */}
          {headerFlags.notifications !== false && onOpenNotifications && (
            <button
              id="header-notification-btn"
              onClick={onOpenNotifications}
              title="Notifications Inbox"
              className={`relative p-1.5 sm:p-2.5 rounded-xl border text-brand-charcoal transition-all shadow-xs cursor-pointer flex items-center gap-1 group active:scale-95 ${
                isScrolled ? 'bg-white hover:bg-brand-cream/80 border-brand-green/15' : 'bg-white hover:bg-brand-cream border-brand-green/10'
              }`}
            >
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-500 group-hover:scale-110 transition-transform fill-amber-500/10" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4.5 h-4.5 sm:min-w-5 sm:h-5 px-1 bg-brand-orange text-brand-charcoal font-black rounded-full text-[9px] sm:text-[10px] flex items-center justify-center animate-bounce border border-white">
                  {unreadNotificationCount}
                </span>
              )}
            </button>
          )}

          {/* Support Mailbox Drawer Button */}
          {headerFlags.mailbox !== false && onOpenMailbox && (
            <button
              id="header-mailbox-btn"
              onClick={onOpenMailbox}
              title="Support Mailbox & Sent Queries"
              className={`relative p-1.5 sm:p-2.5 rounded-xl border text-brand-charcoal transition-all shadow-xs cursor-pointer flex items-center gap-1 group active:scale-95 ${
                isScrolled ? 'bg-white hover:bg-brand-cream/80 border-brand-green/15' : 'bg-white hover:bg-brand-cream border-brand-green/10'
              }`}
            >
              <Mail className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-brand-orange group-hover:scale-110 transition-transform" />
              {unreadMailCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4.5 h-4.5 sm:min-w-5 sm:h-5 px-1 bg-red-500 text-white rounded-full text-[9px] sm:text-[10px] font-bold flex items-center justify-center animate-pulse border border-white">
                  {unreadMailCount}
                </span>
              )}
            </button>
          )}

          {/* Cart Indicator */}
          {headerFlags.cart !== false && (
            <button
              id="header-cart-btn"
              onClick={onOpenCart}
              className={`relative p-1.5 sm:p-2.5 rounded-xl border text-brand-charcoal transition-all shadow-xs cursor-pointer group active:scale-95 ${
                isScrolled ? 'bg-white hover:bg-brand-cream/80 border-brand-green/15' : 'bg-white hover:bg-brand-cream border-brand-green/10'
              }`}
            >
              <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-brand-green group-hover:scale-110 transition-transform" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 sm:w-5 sm:h-5 bg-brand-orange text-white rounded-full text-[9px] sm:text-[10px] font-bold flex items-center justify-center animate-pulse border border-white">
                  {cartCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Floating Scroll Reading Micro Progress Bar */}
      {headerFlags.progressBar !== false && isScrolled && (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 mt-1">
          <div className="h-[2px] w-full bg-brand-green/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-orange via-amber-400 to-brand-green rounded-full transition-all duration-150"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
