/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  ShoppingBag, 
  Mail, 
  Bell, 
  Sparkles, 
  Menu, 
  X, 
  Utensils, 
  Tag, 
  Layers, 
  ChevronRight, 
  Flame, 
  Bike, 
  Bot,
  ExternalLink,
  PartyPopper,
  User,
  Home
} from 'lucide-react';
import { getStoredFeatureFlags, subscribeFeatureFlags } from '../lib/featureFlags';
import { AppFeatureFlags, Kitchen } from '../types';

interface HeaderProps {
  selectedBhatti?: Kitchen | null;
  onOpenBhattiSelector?: () => void;
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
  onNavigateTab?: (tab: string) => void;
}

export default function Header({
  selectedBhatti,
  onOpenBhattiSelector,
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
  onNavigateTab,
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [featureFlags, setFeatureFlags] = useState<AppFeatureFlags>(getStoredFeatureFlags);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeFeatureFlags((flags) => {
      setFeatureFlags(flags);
    });
    const handleOpenDrawer = () => setIsHamburgerOpen(true);
    window.addEventListener('open-hamburger-menu', handleOpenDrawer);
    return () => {
      unsubscribe();
      window.removeEventListener('open-hamburger-menu', handleOpenDrawer);
    };
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

  const ALL_NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: Home, desc: 'Featured Gourmet Creations' },
    { id: 'menu', label: 'Explore Menu', icon: Utensils, desc: 'Full Clay-Oven Specialty Dishes' },
    { id: 'deals', label: 'Hot Deals & Offers', icon: Tag, desc: 'Special Discounts & Offers', badge: '20% OFF' },
    { id: 'coach', label: 'AI Fitness Chef', icon: Bot, desc: 'Macro & Nutrition Recommendations' },
    { id: 'catering', label: 'Catering & Bulk Orders', icon: PartyPopper, desc: 'Custom Gourmet Event Planning' },
    { id: 'deck', label: 'My Deck (Favorites)', icon: Layers, desc: 'Your Saved Combo Decks' },
    { id: 'bhattis', label: 'Our Bhattis Outlets', icon: Flame, desc: 'Clay Tandoor Outlets Directory' },
    { id: 'account', label: 'Account & Orders', icon: User, desc: 'Manage Profile & Tracking' },
  ].filter((item) => !featureFlags.tabDisables?.[item.id]);

  // Position 1-4 are on the bottom bar. Anything positioned after 4 (index >= 4) dynamically populates hamburger menu
  const overflowNavItems = ALL_NAV_ITEMS.slice(4);

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
    <>
      <header
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)' }}
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          isScrolled
            ? 'pb-1.5 sm:pb-2.5 px-2 sm:px-4'
            : 'pb-2 sm:pb-3.5 px-2.5 sm:px-6 bg-brand-cream/95 backdrop-blur-md border-b border-brand-green/10 shadow-xs'
        }`}
      >
        <div
          className={`max-w-6xl mx-auto flex items-center justify-between transition-all duration-300 ${
            isScrolled
              ? 'px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl sm:rounded-3xl bg-white/90 sm:bg-brand-cream/85 backdrop-blur-xl border border-brand-green/20 shadow-xl shadow-brand-charcoal/8 ring-1 ring-amber-400/20'
              : 'w-full'
          }`}
        >
          {/* Brand logo & title */}
          {headerFlags.logo !== false && (
            <div className="flex items-center gap-2 group">
              <div
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`rounded-xl bg-white border border-brand-green/20 flex items-center justify-center p-0.5 shadow-md overflow-hidden shrink-0 transition-all duration-300 cursor-pointer ${
                  isScrolled ? 'w-8 h-8 sm:w-9 sm:h-9 scale-95' : 'w-9 h-9 sm:w-10 sm:h-10'
                }`}
              >
                <img
                  src="/app-icon.png"
                  alt="TAASH BHATTI Logo"
                  className="w-full h-full object-contain rounded-lg group-hover:rotate-6 transition-transform"
                  id="logo-icon"
                />
              </div>

              {/* Desktop text title: TAASH BHATTI (hidden on mobile) */}
              <div 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="hidden sm:block cursor-pointer"
              >
                <h1
                  className={`font-extrabold tracking-tight flex items-center gap-1 transition-all duration-300 ${
                    isScrolled ? 'text-base sm:text-lg' : 'text-base sm:text-xl'
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

              {/* Mobile Location Badge right next to logo */}
              {headerFlags.location !== false && (
                <button
                  type="button"
                  id="header-mobile-location-badge"
                  onClick={onOpenLocationSelector}
                  className="flex sm:hidden items-center gap-1 px-2.5 py-1 rounded-full border border-brand-green/25 bg-brand-green/10 text-brand-green text-[11px] font-bold shadow-2xs max-w-[150px] xs:max-w-[180px] truncate cursor-pointer hover:bg-brand-green/20 transition-all"
                >
                  <MapPin className="w-3 h-3 text-brand-orange animate-bounce shrink-0" />
                  <span className="truncate">
                    {currentAddress || 'Muzaffarpur Hub'}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Right Action Bar */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Desktop Location Badge */}
            {headerFlags.location !== false && (
              <button
                type="button"
                id="header-location-badge"
                onClick={onOpenLocationSelector}
                className={`hidden md:flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  isScrolled
                    ? 'bg-brand-green/15 hover:bg-brand-green/25 border-brand-green/30 text-brand-green'
                    : 'bg-brand-green/10 hover:bg-brand-green/20 border-brand-green/20 text-brand-green'
                }`}
              >
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand-orange animate-bounce" />
                <span className="max-w-[120px] sm:max-w-[200px] truncate">
                  {currentAddress || 'Muzaffarpur Hub'}
                </span>
              </button>
            )}

            {/* My Deck Button (ALWAYS VISIBLE OUTSIDE HAMBURGER ON BOTH MOBILE & DESKTOP) */}
            {headerFlags.deck !== false && onOpenDeck && (
              <button
                id="header-deck-btn"
                onClick={onOpenDeck}
                title="My Deck (Favorite Meals)"
                className={`relative px-2 sm:px-2.5 py-1.5 sm:py-1.5 rounded-xl border text-amber-900 transition-all shadow-xs cursor-pointer flex items-center gap-1 group active:scale-95 ${
                  deckCount > 0
                    ? 'bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border-amber-400/80 shadow-amber-500/10'
                    : 'bg-amber-50/80 hover:bg-amber-100 border-amber-300/50'
                }`}
              >
                <span className="text-xs sm:text-sm group-hover:rotate-12 transition-transform">🃏</span>
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider hidden xs:inline text-amber-950">
                  Deck
                </span>
                {deckCount > 0 ? (
                  <span className="min-w-4 h-4 px-1 bg-brand-charcoal text-amber-300 font-black rounded-full text-[9px] flex items-center justify-center border border-amber-400/60 shadow-xs animate-pulse">
                    {deckCount}
                  </span>
                ) : null}
              </button>
            )}

            {/* Desktop Notification Inbox Button */}
            {headerFlags.notifications !== false && onOpenNotifications && (
              <button
                id="header-notification-btn"
                onClick={onOpenNotifications}
                title="Notifications Inbox"
                className={`hidden sm:flex relative p-1.5 sm:p-2.5 rounded-xl border text-brand-charcoal transition-all shadow-xs cursor-pointer items-center gap-1 group active:scale-95 ${
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

            {/* Desktop Support Mailbox Drawer Button */}
            {headerFlags.mailbox !== false && onOpenMailbox && (
              <button
                id="header-mailbox-btn"
                onClick={onOpenMailbox}
                title="Support Mailbox & Sent Queries"
                className={`hidden sm:flex relative p-1.5 sm:p-2.5 rounded-xl border text-brand-charcoal transition-all shadow-xs cursor-pointer items-center gap-1 group active:scale-95 ${
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

            {/* Cart Indicator (ALWAYS VISIBLE OUTSIDE HAMBURGER ON BOTH MOBILE & DESKTOP) */}
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

            {/* HAMBURGER TOGGLE BUTTON FOR MOBILE / SPACE SAVING */}
            <button
              type="button"
              id="header-hamburger-toggle"
              onClick={() => setIsHamburgerOpen(!isHamburgerOpen)}
              className="p-1.5 sm:p-2 rounded-xl bg-white border border-brand-green/20 text-brand-charcoal hover:bg-brand-cream/80 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Open Navigation & Quick Hub"
              aria-label="Toggle Navigation Drawer"
            >
              {isHamburgerOpen ? (
                <X className="w-5 h-5 text-brand-orange" />
              ) : (
                <div className="relative">
                  <Menu className="w-5 h-5 text-brand-green" />
                  {(unreadNotificationCount > 0 || unreadMailCount > 0) && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-ping" />
                  )}
                </div>
              )}
            </button>
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

      {/* MOBILE HAMBURGER DRAWER MODAL SHEET */}
      {isHamburgerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-brand-charcoal/60 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={() => setIsHamburgerOpen(false)}
          />

          {/* Sliding Content Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xs sm:max-w-sm bg-white shadow-2xl flex flex-col justify-between overflow-y-auto animate-slide-in-right border-l border-brand-green/15">
              
              {/* Drawer Top Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-b from-brand-cream to-white border-b border-brand-green/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white border border-brand-green/20 p-0.5 shadow-sm">
                      <img
                        src="/app-icon.png"
                        alt="TAASH BHATTI"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-sm text-brand-charcoal leading-none">
                        TAASH BHATTI
                      </h2>
                      <span className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                        🟢 Muzaffarpur Hub
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsHamburgerOpen(false)}
                    className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Delivery Address Card inside Hamburger */}
                {headerFlags.location !== false && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsHamburgerOpen(false);
                      onOpenLocationSelector?.();
                    }}
                    className="w-full p-2.5 rounded-2xl bg-white border border-brand-green/15 shadow-xs flex items-center justify-between text-left hover:border-brand-green/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-brand-orange animate-bounce" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold text-stone-400 uppercase block leading-none">
                          Delivering To
                        </span>
                        <span className="text-xs font-black text-brand-charcoal truncate block mt-0.5">
                          {currentAddress || 'Select Delivery Location'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-brand-green group-hover:translate-x-0.5 transition-transform shrink-0">
                      Change →
                    </span>
                  </button>
                )}
              </div>

              {/* Drawer Body Items */}
              <div className="p-4 sm:p-5 space-y-4 flex-1">

                {/* Notifications & Support Mailbox Group */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block px-1">
                    Inbox & Alerts
                  </span>

                  {headerFlags.notifications !== false && onOpenNotifications && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsHamburgerOpen(false);
                        onOpenNotifications();
                      }}
                      className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center relative">
                          <Bell className="w-4 h-4" />
                          {unreadNotificationCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-orange text-white rounded-full text-[8px] font-black flex items-center justify-center">
                              {unreadNotificationCount}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xs font-extrabold text-slate-800">Notifications</h3>
                          <p className="text-[10px] text-slate-500 font-medium">Order updates & announcements</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  )}

                  {headerFlags.mailbox !== false && onOpenMailbox && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsHamburgerOpen(false);
                        onOpenMailbox();
                      }}
                      className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center relative">
                          <Mail className="w-4 h-4" />
                          {unreadMailCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full text-[8px] font-black flex items-center justify-center animate-pulse">
                              {unreadMailCount}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xs font-extrabold text-slate-800">Support Mailbox</h3>
                          <p className="text-[10px] text-slate-500 font-medium">Help desk queries & responses</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                </div>

                {/* Direct Navigation & Dynamic Hamburger Tabs (Positioned after 4) */}
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block px-1">
                    More App Navigation (Position 5+)
                  </span>

                  {overflowNavItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setIsHamburgerOpen(false);
                          if (item.id === 'deck' && onOpenDeck) {
                            onOpenDeck();
                          } else if (item.id === 'bhattis' && onOpenBhattiSelector) {
                            onOpenBhattiSelector();
                          } else {
                            onNavigateTab?.(item.id);
                          }
                        }}
                        className="w-full p-2.5 rounded-xl hover:bg-stone-100/80 bg-stone-50/60 border border-stone-200/50 flex items-center justify-between text-left transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0 group-hover:bg-brand-green group-hover:text-white transition-colors">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-stone-800 block">
                              {item.label}
                            </span>
                            <span className="text-[10px] text-stone-500 font-medium block -mt-0.5">
                              {item.desc}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.id === 'deck' && deckCount > 0 && (
                            <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                              {deckCount}
                            </span>
                          )}
                          {item.id === 'bhattis' && selectedBhatti && (
                            <span className="text-[10px] font-extrabold text-brand-green bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-full">
                              {selectedBhatti.name.split(' ')[0]} 🟢
                            </span>
                          )}
                          {item.badge && item.id !== 'deck' && (
                            <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                              {item.badge}
                            </span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 transition-colors" />
                        </div>
                      </button>
                    );
                  })}
                </div>

              </div>

              {/* Drawer Footer */}
              <div className="p-4 bg-stone-50 border-t border-stone-200/70 text-center">
                <p className="text-[11px] font-bold text-stone-600">
                  TAASH BHATTI • Gourmet Fresh Kitchen
                </p>
                <p className="text-[9px] text-stone-400 font-medium mt-0.5">
                  100% Hygienic • Clay Oven Bhatti Specialties
                </p>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

