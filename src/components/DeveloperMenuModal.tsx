/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Sliders,
  Power,
  ShieldAlert,
  Utensils,
  Tag,
  Wallet,
  MapPin,
  Bike,
  Package,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Flame,
  Bell,
  Mail,
  ShoppingBag,
  Sparkles,
  PartyPopper,
  User,
  Search,
  Check,
  Star,
  MessageSquare,
  Eye,
  SlidersHorizontal,
  Home,
  CheckSquare,
  Square,
  Radio,
  FileText
} from 'lucide-react';
import { AppFeatureFlags, Meal } from '../types';
import { saveFeatureFlags, DEFAULT_FEATURE_FLAGS } from '../lib/featureFlags';

interface DeveloperMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  flags: AppFeatureFlags;
  onUpdateFlags: (newFlags: AppFeatureFlags) => void;
  meals?: Meal[];
}

export const DeveloperMenuModal: React.FC<DeveloperMenuModalProps> = ({
  isOpen,
  onClose,
  flags,
  onUpdateFlags,
  meals = []
}) => {
  const [activeConsoleTab, setActiveConsoleTab] = useState<'header' | 'bottom_nav' | 'operations' | 'categories' | 'dishes'>('header');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Editable messages
  const [closedNotice, setClosedNotice] = useState<string>(
    flags.closedOrderMessage || 'TAASH BHATTI is temporarily paused for new orders. Please check back shortly!'
  );
  const [maintNotice, setMaintNotice] = useState<string>(
    flags.maintenanceMessage || 'TAASH BHATTI is currently performing kitchen maintenance. Orders will reopen shortly.'
  );

  // Dish search
  const [dishSearch, setDishSearch] = useState('');

  if (!isOpen) return null;

  const handleToggle = async <K extends keyof AppFeatureFlags>(key: K, value: AppFeatureFlags[K]) => {
    const updated: AppFeatureFlags = { ...flags, [key]: value };
    onUpdateFlags(updated);
    setSaving(true);
    try {
      await saveFeatureFlags(updated);
      setFeedback(`Updated ${String(key)}!`);
      setTimeout(() => setFeedback(null), 2500);
    } catch (e) {
      setFeedback('Saved locally');
      setTimeout(() => setFeedback(null), 2500);
    } finally {
      setSaving(false);
    }
  };

  const isTabVisible = (tabId: string) => !flags.tabDisables?.[tabId];

  const handleToggleTab = async (tabId: string) => {
    const currentDisables = flags.tabDisables || {};
    const isCurrentlyDisabled = !!currentDisables[tabId];
    const updatedDisables = {
      ...currentDisables,
      [tabId]: !isCurrentlyDisabled,
    };
    await handleToggle('tabDisables', updatedDisables);
  };

  const handleSetAllTabs = async (visible: boolean) => {
    const allTabKeys = ['home', 'menu', 'deals', 'coach', 'catering', 'deck', 'gyms', 'account'];
    const updatedDisables: Record<string, boolean> = {};
    if (!visible) {
      // Disable all except home so user is not completely stuck
      allTabKeys.forEach((key) => {
        if (key !== 'home') updatedDisables[key] = true;
      });
    }
    await handleToggle('tabDisables', updatedDisables);
  };

  const isHeaderVisible = (comp: keyof NonNullable<AppFeatureFlags['headerComponents']>) => {
    return flags.headerComponents?.[comp] !== false;
  };

  const handleToggleHeader = async (comp: keyof NonNullable<AppFeatureFlags['headerComponents']>) => {
    const currentComponents = flags.headerComponents || {
      logo: true,
      location: true,
      deck: true,
      notifications: true,
      mailbox: true,
      cart: true,
      progressBar: true,
    };
    const updated = {
      ...currentComponents,
      [comp]: currentComponents[comp] === false ? true : false,
    };
    await handleToggle('headerComponents', updated);
  };

  const handleToggleCategory = async (cat: string) => {
    const existing = flags.disabledCategories || [];
    const updatedList = existing.includes(cat)
      ? existing.filter(c => c !== cat)
      : [...existing, cat];
    handleToggle('disabledCategories', updatedList);
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Reset all feature flags, header components, and bottom nav menu items to standard defaults?')) {
      onUpdateFlags(DEFAULT_FEATURE_FLAGS);
      await saveFeatureFlags(DEFAULT_FEATURE_FLAGS);
      setClosedNotice(DEFAULT_FEATURE_FLAGS.closedOrderMessage || '');
      setMaintNotice(DEFAULT_FEATURE_FLAGS.maintenanceMessage || '');
      setFeedback('Reset all flags to standard defaults.');
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const standardCategories = [
    'Tandoori Starters',
    'Clay Oven Curries',
    'Breads & Rice',
    'Beverages & Shakes',
    'Deals & Platters',
  ];

  // Header component definitions
  const headerComponentItems = [
    {
      id: 'logo' as const,
      label: 'Brand Logo & Title',
      sublabel: 'TAASH BHATTI logo graphic, title heading, and gourmet subtitle',
      icon: Flame,
      color: 'text-amber-500',
    },
    {
      id: 'location' as const,
      label: 'Delivery Hub / Address Badge',
      sublabel: 'Shows selected delivery address & opens location selector',
      icon: MapPin,
      color: 'text-brand-orange',
    },
    {
      id: 'deck' as const,
      label: 'My Deck Quick Button',
      sublabel: 'Interactive deck icon with dealt cards counter badge',
      icon: Sparkles,
      color: 'text-amber-600',
    },
    {
      id: 'notifications' as const,
      label: 'Notification Bell & Unread Counter',
      sublabel: 'Bell button opening user notification inbox drawer',
      icon: Bell,
      color: 'text-amber-400',
    },
    {
      id: 'mailbox' as const,
      label: 'Support Mailbox Button',
      sublabel: 'Direct envelope icon opening sent queries and ticket inbox',
      icon: Mail,
      color: 'text-brand-orange',
    },
    {
      id: 'cart' as const,
      label: 'Cart Icon & Quantity Bubble',
      sublabel: 'Floating shopping bag indicator opening the slide-over checkout cart',
      icon: ShoppingBag,
      color: 'text-emerald-400',
    },
    {
      id: 'progressBar' as const,
      label: 'Scroll Reading Progress Bar',
      sublabel: 'Micro gradient line showing customer scroll percentage',
      icon: SlidersHorizontal,
      color: 'text-blue-400',
    },
  ];

  // Bottom nav menu items
  const bottomNavItems = [
    {
      id: 'home',
      label: 'Home Tab',
      sublabel: 'Featured dishes, animated hero carousel, and chef specials',
      icon: Home,
      color: 'text-amber-400',
    },
    {
      id: 'menu',
      label: 'Menu Tab',
      sublabel: 'Full dish catalog, pure veg mode toggle, and dietary filters',
      icon: Utensils,
      color: 'text-emerald-400',
    },
    {
      id: 'deals',
      label: 'Offers & Deals Tab',
      sublabel: 'BOGO promotions, meal combos, and bulk coupons zone',
      icon: Tag,
      color: 'text-orange-400',
    },
    {
      id: 'coach',
      label: 'AI Chef Bhatti Tab',
      sublabel: 'Conversational assistant recommending customized Tandoori meals',
      icon: Sparkles,
      color: 'text-amber-300',
    },
    {
      id: 'catering',
      label: 'Catering Planner Tab',
      sublabel: 'Party tray calculator and bulk platter order builder',
      icon: PartyPopper,
      color: 'text-purple-400',
    },
    {
      id: 'deck',
      label: 'My Deck Tab',
      sublabel: 'Customer saved favorite dishes and custom deck deals',
      icon: Sparkles,
      color: 'text-amber-500',
    },
    {
      id: 'gyms',
      label: 'Kitchens Map Tab',
      sublabel: 'Live delivery geofence and hub locations interactive map',
      icon: MapPin,
      color: 'text-teal-400',
    },
    {
      id: 'account',
      label: 'Account & Profile Tab',
      sublabel: 'Bhatti Wallet, live orders, verified phone login, urgent call requests',
      icon: User,
      color: 'text-blue-400',
    },
  ];

  // Filtered meals for stock manager
  const filteredMealsForConsole = meals.filter((m) =>
    (m.name || '').toLowerCase().includes(dishSearch.toLowerCase()) ||
    (m.description || '').toLowerCase().includes(dishSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b1329] text-slate-100 border border-slate-700/80 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#0f1b38] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-wide text-white uppercase">
                  Developer Control Console
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Live Overrides
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Granular control over header components, bottom navigation, and ordering gates.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close Developer Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Console Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-[#080e21] px-3 overflow-x-auto scrollbar-none shrink-0">
          {[
            { id: 'header', label: 'Header Components', icon: SlidersHorizontal },
            { id: 'bottom_nav', label: 'Bottom Nav Menu', icon: Home },
            { id: 'operations', label: 'Operations & Fulfillment', icon: Power },
            { id: 'categories', label: 'Menu Categories', icon: Utensils },
            { id: 'dishes', label: `Dish Stock & Ratings (${meals.length})`, icon: Star },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeConsoleTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveConsoleTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div className="px-5 py-2.5 bg-emerald-950/80 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedback}</span>
            </div>
            {saving && <span className="text-[10px] text-emerald-400/70 animate-pulse">Syncing...</span>}
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar flex-1 text-xs">

          {/* TAB 1: HEADER COMPONENTS */}
          {activeConsoleTab === 'header' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h4 className="font-bold text-white text-sm">Header Components Control</h4>
                  <p className="text-[11px] text-slate-400">
                    Individually enable or disable every element rendered in the top application header.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const allTrue = {
                      logo: true,
                      location: true,
                      deck: true,
                      notifications: true,
                      mailbox: true,
                      cart: true,
                      progressBar: true,
                    };
                    handleToggle('headerComponents', allTrue);
                  }}
                  className="px-2.5 py-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 rounded-lg hover:bg-amber-500/20 transition-colors border border-amber-500/20 cursor-pointer"
                >
                  Enable All Elements
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {headerComponentItems.map((item) => {
                  const Icon = item.icon;
                  const isVisible = isHeaderVisible(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isVisible
                          ? 'bg-slate-800/40 border-slate-700/60'
                          : 'bg-rose-950/20 border-rose-500/30 opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                          isVisible
                            ? 'bg-slate-800 border-slate-700 text-slate-200'
                            : 'bg-rose-950/40 border-rose-500/40 text-rose-400'
                        }`}>
                          <Icon className={`w-4 h-4 ${isVisible ? item.color : 'text-rose-400'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{item.label}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${
                              isVisible ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {isVisible ? 'Visible' : 'Hidden'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{item.sublabel}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleHeader(item.id)}
                        className={`px-3.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                          isVisible
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-rose-600 text-white shadow-xs hover:bg-rose-500'
                        }`}
                      >
                        {isVisible ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: BOTTOM NAVIGATION MENU */}
          {activeConsoleTab === 'bottom_nav' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-white text-sm">Bottom Navigation Bar Menu Components</h4>
                  <p className="text-[11px] text-slate-400">
                    Turn individual customer navigation tabs on or off in real-time.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetAllTabs(true)}
                    className="px-2.5 py-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 cursor-pointer"
                  >
                    Show All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllTabs(false)}
                    className="px-2.5 py-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 rounded-lg hover:bg-rose-500/20 transition-colors border border-rose-500/20 cursor-pointer"
                  >
                    Hide All Except Home
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {bottomNavItems.map((item) => {
                  const Icon = item.icon;
                  const isVisible = isTabVisible(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                        isVisible
                          ? 'bg-slate-800/40 border-slate-700/60'
                          : 'bg-rose-950/20 border-rose-500/30 opacity-75'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                          isVisible
                            ? 'bg-slate-800 border-slate-700 text-slate-200'
                            : 'bg-rose-950/40 border-rose-500/40 text-rose-400'
                        }`}>
                          <Icon className={`w-4 h-4 ${isVisible ? item.color : 'text-rose-400'}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-xs">{item.label}</span>
                            <span className={`text-[8px] px-1.5 py-0.2 rounded font-mono uppercase font-bold ${
                              isVisible ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {isVisible ? 'Active' : 'Hidden'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 leading-snug">{item.sublabel}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleToggleTab(item.id)}
                          className={`w-full py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                            isVisible
                              ? 'bg-slate-700/60 text-slate-300 hover:bg-rose-900/40 hover:text-rose-300'
                              : 'bg-emerald-500 text-black shadow-xs hover:bg-emerald-400'
                          }`}
                        >
                          {isVisible ? 'Hide from Bottom Bar' : 'Show in Bottom Bar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: OPERATIONS & FULFILLMENT */}
          {activeConsoleTab === 'operations' && (
            <div className="space-y-4 animate-fade-in">
              <div className="pb-2 border-b border-slate-800">
                <h4 className="font-bold text-white text-sm">Master Operations & Kitchen Kill Switches</h4>
                <p className="text-[11px] text-slate-400">
                  Directly lock checkout, activate maintenance banner, or disable delivery/takeaway ordering.
                </p>
              </div>

              {/* Master Accepting Orders */}
              <div className={`p-4 rounded-2xl border transition-all ${
                flags.acceptingOrders
                  ? 'bg-emerald-950/25 border-emerald-500/40'
                  : 'bg-rose-950/30 border-rose-500/50'
              }`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      flags.acceptingOrders ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      <Power className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">
                        Kitchen Order Acceptance: {flags.acceptingOrders ? 'ONLINE' : 'PAUSED (CLOSED)'}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {flags.acceptingOrders ? 'Diners can place delivery and takeaway orders' : 'Checkout button is disabled with your custom message'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('acceptingOrders', !flags.acceptingOrders)}
                    className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      flags.acceptingOrders
                        ? 'bg-emerald-500 text-black shadow-xs hover:bg-emerald-400'
                        : 'bg-rose-600 text-white shadow-xs hover:bg-rose-500'
                    }`}
                  >
                    {flags.acceptingOrders ? 'Online' : 'Paused'}
                  </button>
                </div>

                {/* Custom Closed Message Input */}
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-amber-400" />
                    <span>Closed Order Notice Message:</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={closedNotice}
                      onChange={(e) => setClosedNotice(e.target.value)}
                      placeholder="e.g. TAASH BHATTI is temporarily closed for orders..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleToggle('closedOrderMessage', closedNotice)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>

              {/* Maintenance Banner Switch */}
              <div className={`p-4 rounded-2xl border transition-all ${
                flags.maintenanceMode
                  ? 'bg-amber-950/25 border-amber-500/40'
                  : 'bg-slate-800/40 border-slate-700/50'
              }`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      flags.maintenanceMode ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'
                    }`}>
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">
                        Maintenance Banner: {flags.maintenanceMode ? 'ACTIVE' : 'INACTIVE'}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Shows persistent announcement banner at the top of the customer app
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('maintenanceMode', !flags.maintenanceMode)}
                    className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      flags.maintenanceMode
                        ? 'bg-amber-500 text-black shadow-xs hover:bg-amber-400'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {flags.maintenanceMode ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {/* Maintenance text */}
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-amber-400" />
                    <span>Maintenance Banner Announcement:</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={maintNotice}
                      onChange={(e) => setMaintNotice(e.target.value)}
                      placeholder="e.g. TAASH BHATTI is performing kitchen maintenance..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleToggle('maintenanceMessage', maintNotice)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Feature Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Takeaway Ordering */}
                <div className="p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4 text-blue-400" />
                    <div>
                      <span className="font-bold text-slate-200 block">Takeaway Fulfillment</span>
                      <span className="text-[10px] text-slate-400">{flags.enableTakeawayOrdering ? 'Active' : 'Locked'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('enableTakeawayOrdering', !flags.enableTakeawayOrdering)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                      flags.enableTakeawayOrdering
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {flags.enableTakeawayOrdering ? 'Active' : 'Locked'}
                  </button>
                </div>

                {/* Delivery Ordering */}
                <div className="p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Bike className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-bold text-slate-200 block">Delivery Fulfillment</span>
                      <span className="text-[10px] text-slate-400">{flags.enableDeliveryOrdering ? 'Active' : 'Locked'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('enableDeliveryOrdering', !flags.enableDeliveryOrdering)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                      flags.enableDeliveryOrdering
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {flags.enableDeliveryOrdering ? 'Active' : 'Locked'}
                  </button>
                </div>

                {/* Discount Coupons */}
                <div className="p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Tag className="w-4 h-4 text-orange-400" />
                    <div>
                      <span className="font-bold text-slate-200 block">Coupon Engine</span>
                      <span className="text-[10px] text-slate-400">{flags.enableCoupons ? 'Active' : 'Locked'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('enableCoupons', !flags.enableCoupons)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                      flags.enableCoupons
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {flags.enableCoupons ? 'Active' : 'Locked'}
                  </button>
                </div>

                {/* Bhatti Wallet */}
                <div className="p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold text-slate-200 block">Bhatti Wallet & Embers</span>
                      <span className="text-[10px] text-slate-400">{flags.enableWalletSection ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('enableWalletSection', !flags.enableWalletSection)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                      flags.enableWalletSection
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {flags.enableWalletSection ? 'Active' : 'Locked'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MENU CATEGORIES */}
          {activeConsoleTab === 'categories' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h4 className="font-bold text-white text-sm">Culinary Categories Visibility</h4>
                  <p className="text-[11px] text-slate-400">
                    Click to toggle visibility of whole menu sections for customers.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle('disabledCategories', [])}
                    className="px-2.5 py-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 cursor-pointer"
                  >
                    Enable All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {standardCategories.map((cat) => {
                  const isDisabled = (flags.disabledCategories || []).includes(cat);
                  return (
                    <div
                      key={cat}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        isDisabled
                          ? 'bg-rose-950/20 border-rose-500/40'
                          : 'bg-slate-800/40 border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Utensils className={`w-4 h-4 ${isDisabled ? 'text-rose-400' : 'text-amber-400'}`} />
                        <span className={`font-bold text-xs ${isDisabled ? 'text-rose-300 line-through' : 'text-white'}`}>
                          {cat}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                          isDisabled
                            ? 'bg-rose-600 text-white hover:bg-rose-500'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                        }`}
                      >
                        {isDisabled ? 'Hidden' : 'Visible'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: DISHES STOCK & REVIEWS AUDIT */}
          {activeConsoleTab === 'dishes' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-white text-sm">Dishes Stock & Reviews Audit</h4>
                  <p className="text-[11px] text-slate-400">
                    Dishes only show reviews on customer cards if genuine ratings exist ({meals.filter(m => m.rating && m.rating > 0 && m.reviewsCount && m.reviewsCount > 0).length} of {meals.length} rated).
                  </p>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={dishSearch}
                  onChange={(e) => setDishSearch(e.target.value)}
                  placeholder="Search dish by name or keyword..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Dishes list */}
              <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                {filteredMealsForConsole.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    No dishes found matching "{dishSearch}".
                  </div>
                ) : (
                  filteredMealsForConsole.map((meal) => {
                    const hasReviews = !!(meal.rating && meal.rating > 0 && meal.reviewsCount && meal.reviewsCount > 0);
                    return (
                      <div
                        key={meal.id}
                        className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-600 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={meal.image}
                            alt={meal.name}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-700"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs truncate max-w-[200px]">{meal.name}</span>
                              <span className={`w-2 h-2 rounded-full shrink-0 ${meal.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] font-black text-amber-400">₹{meal.price}</span>
                              
                              {/* Rating badge */}
                              {hasReviews ? (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30 flex items-center gap-1">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  <span>{meal.rating?.toFixed(1)}</span>
                                  <span>({meal.reviewsCount} rev)</span>
                                </span>
                              ) : (
                                <span className="text-[9px] bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full font-medium">
                                  Unrated (Cards hide reviews)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${
                            meal.isAvailable !== false ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {meal.isAvailable !== false ? 'In Stock' : 'Sold Out'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0a1124] border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Defaults</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500 hidden sm:inline font-mono">
              Hotkey: Ctrl+Shift+D
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs hover:brightness-110 transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
