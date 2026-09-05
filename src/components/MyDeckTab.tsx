/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Heart, 
  Sparkles, 
  ShoppingBag, 
  Flame, 
  RotateCw, 
  Star, 
  Filter, 
  Search, 
  ArrowRight, 
  Check, 
  Lock, 
  ChefHat, 
  Layers, 
  Zap, 
  Clock, 
  Plus, 
  Minus,
  Utensils
} from 'lucide-react';
import { Meal, User } from '../types';

interface MyDeckTabProps {
  user: User;
  fbUser: any;
  meals: Meal[];
  likedMeals: string[];
  onToggleLike: (mealId: string) => void;
  onAddToCart: (meal: Meal, quantity?: number, customization?: any) => void;
  onSelectTab: (tab: any) => void;
  onOpenCart?: () => void;
}

export default function MyDeckTab({
  user,
  fbUser,
  meals,
  likedMeals,
  onToggleLike,
  onAddToCart,
  onSelectTab,
  onOpenCart
}: MyDeckTabProps) {
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'veg' | 'non_veg' | 'high_protein' | 'low_cal'>('all');
  const [dealSuccessMsg, setDealSuccessMsg] = useState<string | null>(null);

  const isAuthenticated = Boolean(fbUser || (user?.email && !user.email.includes('guest')));

  // Filter meals that are present in user's liked deck
  const deckMeals = useMemo(() => {
    return meals.filter(m => likedMeals.includes(m.id));
  }, [meals, likedMeals]);

  // Filter & Search Deck Meals
  const filteredDeckMeals = useMemo(() => {
    return deckMeals.filter(meal => {
      const matchesSearch = 
        meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meal.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedFilter === 'veg') return meal.isVeg;
      if (selectedFilter === 'non_veg') return !meal.isVeg;
      if (selectedFilter === 'high_protein') return (meal.protein || 0) >= 30;
      if (selectedFilter === 'low_cal') return (meal.calories || 0) <= 500;

      return true;
    });
  }, [deckMeals, searchQuery, selectedFilter]);

  // Aggregate Deck Macro Totals
  const deckMacroTotals = useMemo(() => {
    return deckMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein || 0),
        carbs: acc.carbs + (meal.carbs || 0),
        fats: acc.fats + (meal.fats || 0),
        price: acc.price + meal.price
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0, price: 0 }
    );
  }, [deckMeals]);

  // Toggle 3D Card Flip
  const handleToggleFlip = (mealId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFlippedCards(prev => ({
      ...prev,
      [mealId]: !prev[mealId]
    }));
  };

  // Deal 1 Card to Cart
  const handleDealCard = (meal: Meal, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onAddToCart(meal, 1);
    setDealSuccessMsg(`🃏 Dealt "${meal.name}" into your active cart!`);
    setTimeout(() => setDealSuccessMsg(null), 2500);
  };

  // Deal Entire Deck to Cart in 1 tap
  const handleDealAllToCart = () => {
    if (deckMeals.length === 0) return;
    deckMeals.forEach(meal => {
      onAddToCart(meal, 1);
    });
    setDealSuccessMsg(`♠️ Dealt all ${deckMeals.length} deck cards into your cart!`);
    setTimeout(() => {
      setDealSuccessMsg(null);
      if (onOpenCart) onOpenCart();
    }, 1200);
  };

  // Helper for Playing Card Suit & Rank
  const getCardIdentity = (index: number, meal: Meal) => {
    const suits = [
      { symbol: '♠', name: 'Spade', color: 'text-brand-charcoal', bg: 'bg-zinc-900', border: 'border-amber-400/40' },
      { symbol: '♥', name: 'Heart', color: 'text-red-600', bg: 'bg-red-950', border: 'border-red-400/40' },
      { symbol: '♦', name: 'Diamond', color: 'text-amber-600', bg: 'bg-amber-950', border: 'border-amber-400/40' },
      { symbol: '♣', name: 'Club', color: 'text-emerald-700', bg: 'bg-emerald-950', border: 'border-emerald-400/40' },
    ];
    const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6'];
    const suit = suits[index % suits.length];
    const rank = ranks[index % ranks.length];
    
    let title = 'Royal Card';
    if (rank === 'A') title = 'Ace of Flavor';
    else if (rank === 'K') title = 'King of Protein';
    else if (rank === 'Q') title = 'Queen of Balance';
    else if (rank === 'J') title = 'Jack of Energy';
    else title = `${meal.protein || 25}g Power Hand`;

    return { suit, rank, title };
  };

  // --- SIGNED OUT GATE ---
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 animate-fade-in">
        {/* Playing Card Themed Locked Vault Banner */}
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-brand-charcoal via-zinc-900 to-brand-green/90 p-8 sm:p-12 text-white border-2 border-brand-orange/30 shadow-2xl">
          {/* Ornate Background Playing Card Watermarks */}
          <div className="absolute -top-10 -right-10 text-[180px] font-serif text-white/5 select-none pointer-events-none">
            ♠
          </div>
          <div className="absolute -bottom-12 -left-8 text-[160px] font-serif text-brand-orange/5 select-none pointer-events-none">
            ♥
          </div>

          <div className="relative z-10 max-w-xl mx-auto text-center space-y-6">
            {/* Card Spread Visual */}
            <div className="flex justify-center items-center gap-3 pt-2 pb-4">
              <div className="w-14 h-20 rounded-xl bg-white text-brand-charcoal border-2 border-amber-400 shadow-xl flex flex-col justify-between p-1.5 transform -rotate-12 hover:rotate-0 transition-transform">
                <span className="text-[10px] font-black text-red-600 leading-none">A ♥</span>
                <span className="text-xl text-center">🔥</span>
                <span className="text-[10px] font-black text-red-600 leading-none text-right">A ♥</span>
              </div>
              <div className="w-16 h-24 rounded-xl bg-gradient-to-b from-amber-100 to-white text-brand-charcoal border-2 border-amber-400 shadow-2xl flex flex-col justify-between p-2 transform -translate-y-2 z-10">
                <span className="text-xs font-black text-brand-charcoal leading-none">K ♠</span>
                <span className="text-2xl text-center">🥩</span>
                <span className="text-xs font-black text-brand-charcoal leading-none text-right">K ♠</span>
              </div>
              <div className="w-14 h-20 rounded-xl bg-white text-brand-charcoal border-2 border-amber-400 shadow-xl flex flex-col justify-between p-1.5 transform rotate-12 hover:rotate-0 transition-transform">
                <span className="text-[10px] font-black text-emerald-700 leading-none">Q ♣</span>
                <span className="text-xl text-center">🥗</span>
                <span className="text-[10px] font-black text-emerald-700 leading-none text-right">Q ♣</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-orange/20 border border-brand-orange/40 text-brand-orange text-xs font-black uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" /> Members-Only Feature
            </div>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Unlock Your Personal <span className="text-brand-orange">MY DECK</span>
            </h2>

            <p className="text-sm text-zinc-300 leading-relaxed">
              Sign in to save your favorite powerhouse meals into your personal playing deck. Tap to flip cards for secret chef recipes, track combined daily macros, and deal 1-tap reorders directly to your table.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-orange/20 text-brand-orange flex items-center justify-center font-black text-base shrink-0">
                  🃏
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">3D Flipping Cards</h4>
                  <p className="text-[11px] text-zinc-400">View exact ingredient grams & secret prep notes</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-green/30 text-emerald-400 flex items-center justify-center font-black text-base shrink-0">
                  ⚡
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">1-Tap Fast Deal</h4>
                  <p className="text-[11px] text-zinc-400">Instantly deal single meals or entire deck to cart</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                id="deck-signin-trigger-btn"
                onClick={() => {
                  onSelectTab('account');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-amber-500 hover:to-brand-orange text-brand-charcoal font-black text-sm uppercase tracking-wider shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Sign In to Deal Your Cards →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- SIGNED IN: MY DECK VIEW ---
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in">
      {/* Toast message for card deals */}
      {dealSuccessMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-brand-charcoal text-white text-xs font-bold shadow-2xl flex items-center gap-2.5 border border-brand-orange/40 animate-fade-in">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-orange animate-ping" />
          {dealSuccessMsg}
        </div>
      )}

      {/* 1. HERO DECK HEADER & MACRO ACCUMULATOR */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-charcoal via-zinc-900 to-brand-green/80 text-white p-6 sm:p-8 border border-amber-400/20 shadow-xl">
        {/* Ambient watermark card suit icons */}
        <div className="absolute top-2 right-4 text-7xl font-serif text-white/5 select-none pointer-events-none">
          ♠ ♥ ♦ ♣
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-black uppercase tracking-wider">
              <span>🃏</span> TAASH BHATTI VAULT
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-2">
              <span>MY DECK</span>
              <span className="text-sm sm:text-base font-extrabold px-3 py-1 rounded-full bg-brand-orange text-brand-charcoal">
                {deckMeals.length} {deckMeals.length === 1 ? 'Card' : 'Cards'} Dealt
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-lg">
              Your hand-picked gourmet deck. Tap any meal card to flip and inspect the chef's secret specifications, gram measurements, and culinary notes.
            </p>
          </div>

          {/* Quick Deck Actions & Combined Macro Bar */}
          {deckMeals.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 space-y-3 shrink-0 md:min-w-[320px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-brand-orange animate-pulse" /> Deck Macro Total
                </span>
                <span className="text-xs font-black text-white">₹{deckMacroTotals.price}</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="bg-black/30 p-1.5 rounded-xl border border-white/5">
                  <span className="text-[8px] text-zinc-400 block font-bold">CALORIES</span>
                  <span className="text-xs font-black text-amber-300">{deckMacroTotals.calories}</span>
                </div>
                <div className="bg-black/30 p-1.5 rounded-xl border border-white/5">
                  <span className="text-[8px] text-zinc-400 block font-bold">PROTEIN</span>
                  <span className="text-xs font-black text-emerald-400">{deckMacroTotals.protein}g</span>
                </div>
                <div className="bg-black/30 p-1.5 rounded-xl border border-white/5">
                  <span className="text-[8px] text-zinc-400 block font-bold">CARBS</span>
                  <span className="text-xs font-black text-brand-orange">{deckMacroTotals.carbs}g</span>
                </div>
                <div className="bg-black/30 p-1.5 rounded-xl border border-white/5">
                  <span className="text-[8px] text-zinc-400 block font-bold">FATS</span>
                  <span className="text-xs font-black text-zinc-300">{deckMacroTotals.fats}g</span>
                </div>
              </div>

              <button
                type="button"
                id="deal-entire-deck-btn"
                onClick={handleDealAllToCart}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-brand-orange to-amber-400 hover:from-amber-400 hover:to-brand-orange text-brand-charcoal font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <span>🃏 Deal Entire Deck to Cart</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS */}
      {deckMeals.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-brand-green/10 shadow-xs">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-brand-charcoal/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search your deck by name or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-brand-cream/30 border border-brand-green/15 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-orange transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-charcoal/40 hover:text-brand-charcoal"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Cards 🃏' },
              { id: 'veg', label: 'Veg Only 🌿' },
              { id: 'non_veg', label: 'Non-Veg 🥩' },
              { id: 'high_protein', label: 'High Protein (30g+) 💪' },
              { id: 'low_cal', label: 'Under 500 kcal 🔥' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  selectedFilter === f.id
                    ? 'bg-brand-green text-white shadow-xs'
                    : 'bg-brand-cream/60 hover:bg-brand-cream text-brand-charcoal/70'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. DECK MEAL CARDS GRID WITH 3D FLIP */}
      {deckMeals.length === 0 ? (
        /* Empty Deck State */
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-brand-green/10 shadow-xs space-y-4 max-w-md mx-auto">
          <div className="w-20 h-28 mx-auto rounded-2xl border-2 border-dashed border-brand-orange/40 bg-brand-cream/30 flex flex-col items-center justify-center p-2 text-brand-orange animate-bounce">
            <span className="text-2xl font-black">🃏</span>
            <span className="text-[9px] font-black uppercase mt-1">Empty Slot</span>
          </div>
          <div>
            <h3 className="text-xl font-black text-brand-charcoal">Your Deck is Empty</h3>
            <p className="text-xs text-brand-charcoal/60 mt-1.5 leading-relaxed">
              You haven't dealt any meals into your deck yet. Explore the menu and tap the <Heart className="w-3.5 h-3.5 inline text-rose-500 fill-rose-500" /> icon on any dish to build your winning hand.
            </p>
          </div>
          <button
            type="button"
            id="browse-menu-from-deck-btn"
            onClick={() => {
              onSelectTab('menu');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-green hover:bg-emerald-900 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
          >
            <span>Explore Menu & Deal Cards</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : filteredDeckMeals.length === 0 ? (
        /* Filter No Match State */
        <div className="text-center py-12 px-4 bg-white rounded-3xl border border-brand-green/10 shadow-xs space-y-3">
          <span className="text-3xl">🔍</span>
          <h4 className="text-base font-extrabold text-brand-charcoal">No cards match "{searchQuery || selectedFilter}"</h4>
          <p className="text-xs text-brand-charcoal/50">Try clearing your filters or searching another keyword.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-brand-orange text-brand-charcoal font-black text-xs uppercase"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* THE 3D FLIPPING PLAYING CARDS GRID */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {filteredDeckMeals.map((meal, idx) => {
            const isFlipped = Boolean(flippedCards[meal.id]);
            const cardInfo = getCardIdentity(idx, meal);

            return (
              <div
                key={`deck-card-${meal.id}`}
                className="group relative [perspective:1200px] select-none h-[470px]"
              >
                {/* 3D Flip Container */}
                <div
                  className={`w-full h-full relative transition-transform duration-700 [transform-style:preserve-3d] cursor-pointer ${
                    isFlipped ? '[transform:rotateY(180deg)]' : ''
                  }`}
                  onClick={() => handleToggleFlip(meal.id)}
                >
                  {/* ========================================================================= */}
                  {/* FRONT FACE OF PLAYING CARD                                                */}
                  {/* ========================================================================= */}
                  <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-white rounded-3xl border-2 border-amber-300/60 shadow-lg hover:shadow-2xl transition-shadow flex flex-col justify-between p-4 overflow-hidden">
                    {/* Playing Card Top Corner Index */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="flex flex-col items-center">
                          <span className={`text-base font-black leading-none ${cardInfo.suit.color}`}>
                            {cardInfo.rank}
                          </span>
                          <span className={`text-sm leading-none ${cardInfo.suit.color}`}>
                            {cardInfo.suit.symbol}
                          </span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-700/80 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          {cardInfo.title}
                        </span>
                      </div>

                      {/* Unfavorite / Remove from Deck button */}
                      <button
                        type="button"
                        title="Remove from Deck"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLike(meal.id);
                        }}
                        className="p-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-200 transition-colors shadow-xs"
                      >
                        <Heart className="w-4 h-4 fill-rose-500" />
                      </button>
                    </div>

                    {/* Meal Image Card with Royal Frame */}
                    <div className="relative rounded-2xl overflow-hidden h-44 my-2 border border-amber-300/40 shadow-xs">
                      <img
                        src={meal.image}
                        alt={meal.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />

                      {/* Rating Badge */}
                      {meal.rating && meal.rating > 0 ? (
                        <div className="absolute top-2.5 left-2.5 bg-brand-charcoal/90 text-white font-black text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Star className="w-3 h-3 text-brand-orange fill-brand-orange" />
                          {meal.rating.toFixed(1)}
                        </div>
                      ) : null}

                      {/* Veg / Non-Veg seal */}
                      <div className="absolute bottom-2.5 left-2.5 bg-white/95 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[9px] font-black shadow-sm">
                        <span className={`w-2 h-2 rounded-full ${meal.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {meal.isVeg ? 'VEGETARIAN' : 'NON-VEG'}
                      </div>

                      {/* Flip Hint Overlay Pill */}
                      <div className="absolute bottom-2.5 right-2.5 bg-brand-charcoal/80 text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 backdrop-blur-xs">
                        <RotateCw className="w-3 h-3 animate-spin-slow" /> Tap to Flip
                      </div>
                    </div>

                    {/* Meal Content & Specs */}
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-extrabold text-sm text-brand-charcoal leading-snug line-clamp-1">
                          {meal.name}
                        </h3>
                        <p className="text-[11px] text-brand-charcoal/60 line-clamp-1 mt-0.5">
                          {meal.description}
                        </p>
                      </div>

                      {/* Macro Pill Ribbon */}
                      <div className="grid grid-cols-4 gap-1 text-center bg-brand-cream/40 p-1.5 rounded-xl border border-brand-green/10">
                        <div>
                          <span className="text-[8px] text-brand-charcoal/40 font-bold block">CAL</span>
                          <span className="text-[11px] font-black text-brand-charcoal">{meal.calories || 0}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-brand-charcoal/40 font-bold block">PRO</span>
                          <span className="text-[11px] font-black text-brand-green">{meal.protein || 0}g</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-brand-charcoal/40 font-bold block">CARBS</span>
                          <span className="text-[11px] font-black text-brand-orange">{meal.carbs || 0}g</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-brand-charcoal/40 font-bold block">FATS</span>
                          <span className="text-[11px] font-black text-brand-charcoal">{meal.fats || 0}g</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Row: Price & Deal into Cart */}
                    <div className="pt-2 border-t border-amber-200/40 flex items-center justify-between">
                      <div>
                        <span className="text-[8px] text-brand-charcoal/50 block uppercase font-bold leading-none">
                          ROYAL PRICE
                        </span>
                        <span className="text-base font-black text-brand-charcoal">
                          ₹{meal.price}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Quick Flip Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleFlip(meal.id, e)}
                          title="Flip for Secret Specs"
                          className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-all text-xs font-bold flex items-center gap-1"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>

                        {/* Deal into Cart Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDealCard(meal, e)}
                          className="px-3.5 py-2 rounded-xl bg-brand-green hover:bg-emerald-900 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Deal</span>
                        </button>
                      </div>
                    </div>

                    {/* Playing Card Bottom-Right Corner Index (Inverted) */}
                    <div className="absolute bottom-2 right-3 flex items-center gap-1 rotate-180 pointer-events-none opacity-40">
                      <span className={`text-[11px] font-black ${cardInfo.suit.color}`}>{cardInfo.rank}</span>
                      <span className={`text-[9px] ${cardInfo.suit.color}`}>{cardInfo.suit.symbol}</span>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* BACK FACE OF PLAYING CARD (CHEF'S SECRET SPECS & INGREDIENTS)             */}
                  {/* ========================================================================= */}
                  <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-br from-brand-charcoal via-zinc-900 to-black text-white rounded-3xl border-2 border-amber-400 shadow-2xl flex flex-col justify-between p-5 overflow-hidden">
                    {/* Ornate Background Pattern */}
                    <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

                    {/* Top Header on Flip Side */}
                    <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-amber-400">{cardInfo.rank} {cardInfo.suit.symbol}</span>
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">
                            Chef's Secret Specs
                          </h4>
                          <span className="text-[9px] text-amber-300/80 font-bold block">
                            Taash Bhatti Formula
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleToggleFlip(meal.id, e)}
                        className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-400/30 transition-all text-xs flex items-center gap-1"
                        title="Flip back to Front"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Culinary Specs Content */}
                    <div className="relative z-10 space-y-3 my-auto overflow-y-auto max-h-[290px] pr-1 scrollbar-thin">
                      <div>
                        <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block mb-1">
                          🥘 Fresh Ingredients & Weights
                        </span>
                        <div className="space-y-1 text-xs">
                          {(meal.ingredients && meal.ingredients.length > 0) ? (
                            meal.ingredients.map((ing, iIdx) => (
                              <div key={iIdx} className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/5 border border-white/5 text-[11px]">
                                <span className="text-zinc-200 font-semibold">{ing.name}</span>
                                <span className="font-extrabold text-amber-300">{ing.grams}g</span>
                              </div>
                            ))
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/5 text-[11px]">
                                <span className="text-zinc-300">Lean Protein / Base</span>
                                <span className="font-bold text-amber-300">{Math.round((meal.protein || 25) * 4.5)}g</span>
                              </div>
                              <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/5 text-[11px]">
                                <span className="text-zinc-300">Complex Carbs & Fibers</span>
                                <span className="font-bold text-amber-300">{Math.round((meal.carbs || 30) * 3.2)}g</span>
                              </div>
                              <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/5 text-[11px]">
                                <span className="text-zinc-300">Bhatti Clay Oven Spices</span>
                                <span className="font-bold text-amber-300">Fresh Blend</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Flavor Profile & Cooking Notes */}
                      <div className="bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/20 text-[11px] space-y-1">
                        <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider block">
                          🔥 Clay Bhatti Oven Prep
                        </span>
                        <p className="text-zinc-300 text-[10px] leading-relaxed italic">
                          "Flame-charred over organic hardwood coals, preserving 98% muscle-building amino chains with zero refined seed oils."
                        </p>
                      </div>

                      {/* Quick Meta Indicators */}
                      <div className="grid grid-cols-3 gap-1 text-center">
                        <div className="p-1 rounded-lg bg-white/5 border border-white/10">
                          <span className="text-[8px] text-zinc-400 block font-bold">PREP TIME</span>
                          <span className="text-[10px] font-black text-amber-300">{meal.prepTimeMinutes || 20}m</span>
                        </div>
                        <div className="p-1 rounded-lg bg-white/5 border border-white/10">
                          <span className="text-[8px] text-zinc-400 block font-bold">SPICE LEVEL</span>
                          <span className="text-[10px] font-black text-brand-orange capitalize">{meal.spicyLevel || 'Medium'}</span>
                        </div>
                        <div className="p-1 rounded-lg bg-white/5 border border-white/10">
                          <span className="text-[8px] text-zinc-400 block font-bold">ANABOLIC</span>
                          <span className="text-[10px] font-black text-emerald-400">98% High</span>
                        </div>
                      </div>
                    </div>

                    {/* Flip Back & Deal Actions */}
                    <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleToggleFlip(meal.id, e)}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Flip Back</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDealCard(meal, e)}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-brand-orange hover:from-brand-orange hover:to-amber-400 text-brand-charcoal font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Deal to Cart • ₹{meal.price}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
