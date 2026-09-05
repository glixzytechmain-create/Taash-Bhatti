/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  SlidersHorizontal,
  Star,
  Heart,
  Eye,
  Plus,
  Flame,
  UtensilsCrossed,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  ChefHat,
  Sparkles,
  Check,
  MessageSquare,
} from 'lucide-react';
import { Meal, Gym } from '../types';
import { MEALS_DATA } from '../data';
import MealReviewsSection from './MealReviewsSection';

interface FlyingCardAnimation {
  id: string;
  meal: Meal;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  targetX: number;
  targetY: number;
}

interface MenuTabProps {
  onAddToCart: (meal: Meal) => void;
  likedMeals: string[];
  onToggleLike: (mealId: string) => void;
  selectedGym: Gym | null;
  preSelectedGoal: string | null;
  onClearPreSelectedGoal: () => void;
  onOpenDeals?: () => void;
  meals?: Meal[];
}

export default function MenuTab({
  onAddToCart,
  likedMeals,
  onToggleLike,
  selectedGym,
  preSelectedGoal,
  onClearPreSelectedGoal,
  onOpenDeals,
  meals = MEALS_DATA,
}: MenuTabProps) {
  // Filter States
  const [vegMode, setVegMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGoal, setActiveGoal] = useState<string>('all');
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'non_veg' | 'vegan'>('all');
  const [calorieFilter, setCalorieFilter] = useState<string>('all'); // 'low' (<400), 'mid' (400-500), 'high' (>500)
  const [proteinFilter, setProteinFilter] = useState<string>('all'); // 'normal' (<25g), 'high' (25g+)
  const [sortBy, setSortBy] = useState<string>('popularity'); // 'popularity', 'price_asc', 'price_desc', 'protein', 'calories'
  const [showFilters, setShowFilters] = useState(false);

  // Quick view Modal State
  const [selectedQuickView, setSelectedQuickView] = useState<Meal | null>(null);

  // Flying Cards Animation State
  const [flyingCards, setFlyingCards] = useState<FlyingCardAnimation[]>([]);

  // Trigger Deal to Deck animation
  const handleDealToDeck = (e: React.MouseEvent, meal: Meal) => {
    e.stopPropagation();
    const isAlreadyInDeck = likedMeals.includes(meal.id);

    if (!isAlreadyInDeck) {
      // Get click / card source bounding rect
      const targetElement =
        (e.currentTarget as HTMLElement).closest('.meal-card-container') ||
        (e.currentTarget as HTMLElement);
      const rect = targetElement.getBoundingClientRect();

      // Find Header My Deck button location
      const headerBtn = document.getElementById('header-deck-btn');
      let targetX = window.innerWidth - 120;
      let targetY = 24;
      if (headerBtn) {
        const headerRect = headerBtn.getBoundingClientRect();
        targetX = headerRect.left + headerRect.width / 2;
        targetY = headerRect.top + headerRect.height / 2;
      }

      const animId = `fly-${meal.id}-${Date.now()}`;
      setFlyingCards((prev) => [
        ...prev,
        {
          id: animId,
          meal,
          startX: rect.left,
          startY: rect.top,
          startWidth: Math.min(rect.width, 320),
          startHeight: Math.min(rect.height, 420),
          targetX,
          targetY,
        },
      ]);

      // Complete animation & pulse header button
      setTimeout(() => {
        if (headerBtn) {
          headerBtn.classList.add('ring-4', 'ring-amber-400', 'scale-110', 'bg-amber-200');
          setTimeout(() => {
            headerBtn.classList.remove('ring-4', 'ring-amber-400', 'scale-110', 'bg-amber-200');
          }, 500);
        }
        setFlyingCards((prev) => prev.filter((c) => c.id !== animId));
      }, 950);
    }

    onToggleLike(meal.id);
  };

  // Handle pre-selected goal from homepage click
  useEffect(() => {
    if (preSelectedGoal) {
      setActiveGoal(preSelectedGoal);
      // Clear it after setting, so users can change it if they want
      onClearPreSelectedGoal();
    }
  }, [preSelectedGoal, onClearPreSelectedGoal]);

  // Culinary Menu Categories
  const categoriesList = [
    { id: 'all', label: 'All Specialties' },
    { id: 'tandoori', label: '🔥 Tandoori & Kebabs', keyword: 'tandoor' },
    { id: 'curry', label: '🍲 Clay-Oven Curries', keyword: 'curry' },
    { id: 'breads_rice', label: '🥖 Breads & Biryani', keyword: 'biryani' },
    { id: 'bowls_salads', label: '🥗 Fresh Bowls', keyword: 'bowl' },
    { id: 'beverages', label: '🥤 Shakes & Drinks', keyword: 'shake' },
  ];

  // Memoized filtered and sorted meals
  const filteredMeals = useMemo(() => {
    return meals.filter((meal) => {
      // Exclude hidden meals
      if (meal.isHidden) return false;

      // Search match
      const matchesSearch = meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meal.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Category match
      const matchesCategory = activeGoal === 'all' || (() => {
        const target = categoriesList.find(c => c.id === activeGoal);
        if (!target || !target.keyword) return true;
        const kw = target.keyword.toLowerCase();
        return (
          (meal.name || '').toLowerCase().includes(kw) ||
          (meal.description || '').toLowerCase().includes(kw) ||
          ((meal as any).category || '').toLowerCase().includes(kw) ||
          (meal.goals || []).some(g => String(g).toLowerCase().includes(kw))
        );
      })();

      // Diet match (Veg Mode master switch strictly enforces vegetarian & vegan dishes)
      const matchesDiet = vegMode
        ? (meal.isVeg || meal.isVegan)
        : (dietFilter === 'all' ||
          (dietFilter === 'veg' && meal.isVeg) ||
          (dietFilter === 'vegan' && meal.isVegan) ||
          (dietFilter === 'non_veg' && !meal.isVeg));

      // Calorie range match
      let matchesCalories = true;
      if (calorieFilter === 'low') matchesCalories = meal.calories < 400;
      else if (calorieFilter === 'mid') matchesCalories = meal.calories >= 400 && meal.calories <= 500;
      else if (calorieFilter === 'high') matchesCalories = meal.calories > 500;

      return matchesSearch && matchesCategory && matchesDiet && matchesCalories;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'calories') return a.calories - b.calories; // lower calories first
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      return (b.popularity || 0) - (a.popularity || 0); // default popularity
    });
  }, [meals, searchQuery, activeGoal, vegMode, dietFilter, calorieFilter, sortBy]);

  // Reset all filters
  const handleResetFilters = () => {
    setVegMode(false);
    setSearchQuery('');
    setActiveGoal('all');
    setDietFilter('all');
    setCalorieFilter('all');
    setProteinFilter('all');
    setSortBy('popularity');
  };

  return (
    <div className="pb-24 max-w-6xl mx-auto px-4 pt-4">
      {/* DEALS & COMBOS QUICK EXPLORE BANNER */}
      {onOpenDeals && (
        <div
          onClick={onOpenDeals}
          className="mb-4 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/15 cursor-pointer flex items-center justify-between gap-3 hover:scale-[1.01] transition-all group border border-amber-300/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 text-xl group-hover:rotate-12 transition-transform">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  Deals & Combos Zone
                </h3>
                <span className="text-[8px] bg-black/30 font-black px-1.5 py-0.5 rounded text-amber-200 uppercase tracking-widest">
                  Live Offers
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-white/90 font-medium">
                Build your own meal box, claim BOGO deals, or order curated value combos.
              </p>
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-xl bg-white text-brand-charcoal font-black text-[10px] sm:text-xs uppercase tracking-wider shrink-0 group-hover:bg-amber-100 transition-colors flex items-center gap-1 shadow-sm">
            <span>Explore</span>
            <Sparkles className="w-3.5 h-3.5 text-brand-orange fill-brand-orange" />
          </button>
        </div>
      )}

      {/* 0. VEG MODE MASTER SWITCH (FIRST FILTER ON THE MENU PAGE) */}
      <div
        id="veg-mode-toggle-card"
        className={`mb-3 p-3 rounded-2xl sm:rounded-3xl border transition-all duration-300 flex items-center justify-between gap-3 shadow-xs ${
          vegMode
            ? 'bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50/90 border-emerald-500/40 shadow-emerald-500/10 ring-1 ring-emerald-400/30'
            : 'bg-white border-brand-green/15 hover:border-brand-green/30'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
              vegMode
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/25 scale-105'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
            }`}
          >
            <span className="text-base sm:text-lg leading-none">🌱</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-brand-charcoal">
                Veg Mode
              </span>
              <div className="w-3.5 h-3.5 rounded border border-emerald-600 flex items-center justify-center p-0.5 bg-white shadow-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-600" />
              </div>
              {vegMode ? (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs animate-pulse">
                  Pure Veg Active
                </span>
              ) : (
                <span className="text-[9px] font-bold text-brand-charcoal/40 uppercase bg-slate-100 px-1.5 py-0.2 rounded">
                  All Diets
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-brand-charcoal/65 font-medium mt-0.5">
              {vegMode
                ? 'Only 100% vegetarian & plant-based clay oven specialties are shown'
                : 'Turn on to instantly filter out non-vegetarian dishes across the catalog'}
            </p>
          </div>
        </div>

        <button
          type="button"
          id="veg-mode-toggle"
          onClick={() => setVegMode(!vegMode)}
          className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            vegMode ? 'bg-emerald-500' : 'bg-slate-200'
          }`}
          role="switch"
          aria-checked={vegMode}
          title="Toggle Veg Mode"
        >
          <span className="sr-only">Toggle Veg Mode</span>
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
              vegMode ? 'translate-x-7 text-emerald-600 text-[11px] font-bold' : 'translate-x-0 text-slate-400 text-[10px]'
            }`}
          >
            {vegMode ? '🌿' : '⚪'}
          </span>
        </button>
      </div>

      {/* 1. SEARCH BAR */}
      <div className="relative flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-brand-charcoal/40" />
          <input
            id="menu-search-input"
            type="text"
            placeholder={vegMode ? "Search pure veg dishes, breads, shakes..." : "Search tandoori dishes, handi biryani, platters..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-brand-green/10 rounded-2xl py-3.5 pl-11 pr-4 text-xs font-semibold placeholder-brand-charcoal/40 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
          />
        </div>
        <button
          id="menu-filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-center cursor-pointer ${
            showFilters
              ? 'bg-brand-green text-white border-brand-green'
              : 'bg-white text-brand-charcoal border-brand-green/10 hover:bg-brand-green/5'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* 2. COLLAPSIBLE FILTERS PANEL */}
      {showFilters && (
        <div className="bg-white border border-brand-green/10 rounded-3xl p-4 mb-4 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-brand-green/5">
            <span className="text-xs font-extrabold text-brand-green uppercase tracking-wider">Advanced Filters</span>
            <button
              onClick={handleResetFilters}
              className="text-[10px] font-bold text-brand-orange uppercase tracking-wider hover:underline"
            >
              Reset All
            </button>
          </div>

          <div className="space-y-4">
            {/* Diet Filter */}
            <div>
              <span className="text-[11px] font-extrabold text-brand-charcoal/60 block mb-1.5">Diet Type</span>
              <div className="grid grid-cols-4 gap-2">
                {(['all', 'veg', 'non_veg', 'vegan'] as const).map((diet) => (
                  <button
                    key={diet}
                    onClick={() => setDietFilter(diet)}
                    className={`py-2 px-0.5 rounded-xl text-[9px] font-bold uppercase border tracking-wider transition-all cursor-pointer ${
                      dietFilter === diet
                        ? 'bg-brand-green text-white border-brand-green'
                        : 'bg-brand-cream/20 text-brand-charcoal border-brand-green/10'
                    }`}
                  >
                    {diet === 'all' ? 'All' : diet === 'veg' ? '🌿 Veg' : diet === 'vegan' ? '🌱 Vegan' : '🍖 Non-Veg'}
                  </button>
                ))}
              </div>
            </div>

            {/* Calorie Range */}
            <div>
              <span className="text-[11px] font-extrabold text-brand-charcoal/60 block mb-1.5">Calorie Range</span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'low', label: '< 400' },
                  { id: 'mid', label: '400 - 500' },
                  { id: 'high', label: '> 500' },
                ].map((range) => (
                  <button
                    key={range.id}
                    onClick={() => setCalorieFilter(range.id)}
                    className={`py-2 px-1 rounded-xl text-[10px] font-bold border tracking-wider transition-all cursor-pointer ${
                      calorieFilter === range.id
                        ? 'bg-brand-green text-white border-brand-green'
                        : 'bg-brand-cream/20 text-brand-charcoal border-brand-green/10'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sorting */}
            <div>
              <span className="text-[11px] font-extrabold text-brand-charcoal/60 block mb-1.5">Sort Dishes</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'popularity', label: '🔥 Best Sellers' },
                  { id: 'rating', label: '⭐️ Highest Rated' },
                  { id: 'price_asc', label: '💵 Price: Low to High' },
                  { id: 'price_desc', label: '💵 Price: High to Low' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSortBy(opt.id)}
                    className={`py-2 px-2.5 rounded-xl text-[10px] text-left font-semibold border tracking-wide transition-all cursor-pointer ${
                      sortBy === opt.id
                        ? 'bg-brand-orange text-brand-charcoal border-brand-orange font-bold'
                        : 'bg-brand-cream/20 text-brand-charcoal border-brand-green/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. HORIZONTAL CATEGORY CAROUSEL */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none snap-x">
        {categoriesList.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveGoal(cat.id)}
            className={`px-4 py-2.5 shrink-0 snap-start rounded-full text-xs font-bold transition-all cursor-pointer border ${
              activeGoal === cat.id
                ? 'bg-brand-green text-white border-brand-green shadow-xs'
                : 'bg-white text-brand-charcoal border-brand-green/10 hover:bg-brand-green/5'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 4. MEAL CARD GRID */}
      {filteredMeals.length === 0 ? (
        <div className="py-16 text-center">
          <UtensilsCrossed className="w-12 h-12 text-brand-charcoal/20 mx-auto mb-3" />
          <h4 className="font-extrabold text-sm text-brand-charcoal">No dishes match your filters</h4>
          <p className="text-xs text-brand-charcoal/50 mt-1">Try resetting your diet or calorie range targets.</p>
          <button
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 bg-brand-green text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMeals.map((meal, mealIdx) => {
            const isLiked = likedMeals.includes(meal.id);

            return (
              <div
                key={`menu-meal-${meal.id || mealIdx}-${mealIdx}`}
                className="meal-card-container bg-white rounded-3xl border border-brand-green/10 p-3.5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group/card relative"
              >
                <div>
                  {/* Photo area */}
                  <div className="relative rounded-2xl overflow-hidden h-44 mb-3">
                    <img
                      src={meal.image}
                      alt={meal.name}
                      className={`w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105 ${meal.isAvailable === false ? 'grayscale contrast-75 opacity-70' : ''}`}
                      referrerPolicy="no-referrer"
                    />

                    {/* Left top: Rating (STRICTLY ONLY shown when dish has been rated with reviews) */}
                    {meal.rating && meal.rating > 0 && meal.reviewsCount && meal.reviewsCount > 0 ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedQuickView(meal);
                        }}
                        title={`Rated ${meal.rating.toFixed(1)}/5 from ${meal.reviewsCount} diner reviews. Click to read reviews.`}
                        className="absolute top-3 left-3 bg-brand-charcoal/90 hover:bg-brand-charcoal text-white font-black text-[9px] px-2.5 py-1 rounded-full uppercase flex items-center gap-1 shadow-md backdrop-blur-xs cursor-pointer border border-white/10 active:scale-95 transition-all"
                      >
                        <Star className="w-3.5 h-3.5 text-brand-orange fill-brand-orange" />
                        <span>{meal.rating.toFixed(1)}</span>
                        <span className="text-white/60 text-[8px]">({meal.reviewsCount})</span>
                      </button>
                    ) : null}

                    {/* Right top: Add to My Deck button */}
                    <button
                      type="button"
                      title={isLiked ? 'In Your Deck (Tap to remove)' : 'Deal into MY DECK 🃏'}
                      onClick={(e) => handleDealToDeck(e, meal)}
                      className={`absolute top-3 right-3 px-2.5 py-1.5 rounded-full border shadow-md transition-all cursor-pointer flex items-center gap-1.5 backdrop-blur-md active:scale-95 ${
                        isLiked
                          ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-rose-500 text-white border-amber-300 ring-2 ring-amber-300/60 shadow-amber-500/40 font-black'
                          : 'bg-white/95 text-brand-charcoal border-white/60 hover:bg-amber-50 hover:border-amber-400 hover:text-amber-900 font-bold'
                      }`}
                    >
                      <span className="text-xs">🃏</span>
                      <span className="text-[10px] tracking-tight">
                        {isLiked ? 'In Deck' : 'Add to Deck'}
                      </span>
                    </button>

                    {/* Sold out overlay */}
                    {meal.isAvailable === false && (
                      <div className="absolute inset-0 bg-brand-charcoal/50 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center">
                        <span className="bg-red-600 text-white text-[11px] font-black px-3.5 py-1.5 rounded-xl shadow-lg border border-red-500 uppercase tracking-widest">
                          SOLD OUT
                        </span>
                        {meal.soldOutReason && (
                          <span className="mt-1.5 text-[9px] font-bold text-red-100 bg-red-950/80 px-2 py-0.5 rounded-md max-w-[85%] truncate">
                            {meal.soldOutReason}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Veg/Vegan/Non-Veg indicator dot overlay */}
                    <div className="absolute bottom-3 left-3 bg-white/95 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm text-[9px] font-extrabold backdrop-blur-xs">
                      <span className={`w-2.5 h-2.5 rounded-full border ${meal.isVegan ? 'bg-green-500 border-green-200' : meal.isVeg ? 'bg-emerald-500 border-emerald-200' : 'bg-red-500 border-red-200'}`} />
                      {meal.isVegan ? '🌱 VEGAN' : meal.isVeg ? '🌿 VEGETARIAN' : '🥩 NON-VEGETARIAN'}
                    </div>

                    {meal.partnerGymExclusive && (
                      <div className="absolute bottom-3 right-3 bg-brand-orange text-brand-charcoal font-black text-[9px] px-2 py-1 rounded-lg tracking-wider">
                        ⭐ GYM ELITE
                      </div>
                    )}
                  </div>

                  {/* Details Area */}
                  <div className="px-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {(meal.goals || []).map((g, idx) => (
                        <span key={`g-${g}-${idx}`} className="text-[8px] font-black uppercase bg-brand-green/10 text-brand-green px-2 py-0.5 rounded-full">
                          {g.replace('_', ' ')}
                        </span>
                      ))}
                      {(meal.timings || []).map((t, idx) => (
                        <span key={`t-${t}-${idx}`} className="text-[8px] font-bold uppercase bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>

                    <h4 className="font-extrabold text-base text-brand-charcoal leading-snug">{meal.name}</h4>
                    <p className="text-xs text-brand-charcoal/60 mt-1 line-clamp-2">{meal.description}</p>

                    {/* View Details & Nutrition trigger */}
                    <button
                      type="button"
                      onClick={() => setSelectedQuickView(meal)}
                      className="mt-2 text-[11px] font-bold text-brand-green hover:text-brand-green/80 flex items-center gap-1 cursor-pointer transition-colors group/link"
                    >
                      <span>View details & nutrition</span>
                      <span className="text-xs transition-transform group-hover/link:translate-x-0.5">→</span>
                    </button>

                    {/* Verified Diner Reviews strip: STRICTLY ONLY shown on meal cards for dishes that have been rated */}
                    {meal.rating && meal.rating > 0 && meal.reviewsCount && meal.reviewsCount > 0 ? (
                      <div className="mt-2.5 p-2 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-center justify-between gap-2 shadow-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="flex text-amber-500 shrink-0">
                            {[...Array(Math.min(5, Math.floor(meal.rating)))].map((_, starIdx) => (
                              <Star key={starIdx} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <span className="text-[11px] font-black text-amber-950">
                            {meal.rating.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-amber-900/80 font-medium truncate">
                            ({meal.reviewsCount} {meal.reviewsCount === 1 ? 'review' : 'reviews'})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQuickView(meal);
                          }}
                          className="shrink-0 text-[10px] font-extrabold text-amber-900 hover:text-amber-950 bg-amber-200/70 hover:bg-amber-200 px-2 py-0.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1 border border-amber-300/60"
                          title="Read customer reviews for this dish"
                        >
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span>Reviews</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Pricing / Actions Trigger */}
                <div className="mt-4 pt-3.5 border-t border-brand-green/5 flex items-center justify-between px-1 gap-2">
                  <div>
                    <span className="text-[9px] font-bold text-brand-charcoal/40 uppercase block leading-none">Bhatti Price</span>
                    <span className="text-lg font-black text-brand-charcoal">₹{meal.price}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Quick View Button */}
                    <button
                      onClick={() => setSelectedQuickView(meal)}
                      className="p-2.5 rounded-xl border border-brand-green/20 text-brand-green bg-white hover:bg-brand-green/5 transition-all flex items-center justify-center cursor-pointer"
                      title="Quick View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Secondary Deal to Deck Action Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDealToDeck(e, meal)}
                      title={isLiked ? 'In Deck (Click to remove)' : 'Add to My Deck 🃏'}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
                        isLiked
                          ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs'
                          : 'border-amber-300/70 text-amber-800 bg-amber-50/60 hover:bg-amber-100 hover:border-amber-400'
                      }`}
                    >
                      <span className="text-xs">🃏</span>
                    </button>

                    {meal.isAvailable === false ? (
                      <button
                        disabled
                        className="px-3.5 py-2.5 bg-brand-charcoal/10 text-brand-charcoal/40 font-black text-xs rounded-xl cursor-not-allowed flex items-center gap-1 border border-brand-charcoal/5"
                      >
                        Sold Out
                      </button>
                    ) : (
                      <button
                        onClick={() => onAddToCart(meal)}
                        className="px-3.5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white font-black text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-4 h-4 stroke-[3px]" /> Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. QUICK VIEW DIALOG / MODAL */}
      {selectedQuickView && (
        <div className="fixed inset-0 z-50 bg-brand-charcoal/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl border-t border-brand-green/10 flex flex-col max-h-[90vh]">
            
            {/* Hero Photo header */}
            <div className="relative h-56 shrink-0">
              <img
                src={selectedQuickView.image}
                alt={selectedQuickView.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setSelectedQuickView(null)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-brand-charcoal/80 text-white hover:bg-brand-charcoal transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {selectedQuickView.rating && selectedQuickView.rating > 0 && selectedQuickView.reviewsCount && selectedQuickView.reviewsCount > 0 ? (
                <div className="absolute bottom-4 left-4 bg-brand-charcoal/90 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md">
                  <Star className="w-3.5 h-3.5 text-brand-orange fill-brand-orange" />
                  {selectedQuickView.rating.toFixed(1)} ({selectedQuickView.reviewsCount} {selectedQuickView.reviewsCount === 1 ? 'review' : 'reviews'})
                </div>
              ) : null}

              {/* Deal to Deck on Quick View */}
              <button
                type="button"
                onClick={(e) => handleDealToDeck(e, selectedQuickView)}
                className={`absolute bottom-4 right-4 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                  likedMeals.includes(selectedQuickView.id)
                    ? 'bg-amber-500 text-white border-amber-300'
                    : 'bg-white/90 text-brand-charcoal border-white/60 hover:bg-white'
                }`}
              >
                <span>🃏</span>
                <span>{likedMeals.includes(selectedQuickView.id) ? 'In My Deck' : 'Add to Deck'}</span>
              </button>
            </div>

            {/* Scrollable details container */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <div className="flex gap-2 mb-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${selectedQuickView.isVegan ? 'bg-green-500' : selectedQuickView.isVeg ? 'bg-emerald-500' : 'bg-red-500'} inline-block my-auto`} />
                  <span className="text-[10px] font-black uppercase text-brand-charcoal/50 tracking-wider">
                    {selectedQuickView.isVegan ? 'Vegan Delight' : selectedQuickView.isVeg ? 'Pure Vegetarian' : 'Non-Vegetarian'}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-brand-charcoal leading-tight">
                  {selectedQuickView.name}
                </h3>
                <p className="text-xs text-brand-charcoal/70 mt-2 leading-relaxed">
                  {selectedQuickView.description}
                </p>
              </div>

              {/* Ingredients List (Grams approximate) */}
              {selectedQuickView.ingredients && selectedQuickView.ingredients.length > 0 && (
                <div className="bg-brand-cream/45 border border-brand-green/10 rounded-2xl p-3.5">
                  <h4 className="text-[10px] font-black uppercase text-brand-green tracking-wider mb-2 flex items-center gap-1">
                    <ChefHat className="w-4 h-4 text-brand-green" /> KEY INGREDIENTS (APPROX. WEIGHT)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedQuickView.ingredients.map((ing, idx) => (
                      <span key={idx} className="bg-white border border-brand-green/10 px-2.5 py-1 rounded-xl text-[10px] font-bold text-brand-charcoal flex items-center gap-1">
                        {ing.name}: <span className="text-brand-orange font-extrabold">{ing.grams}g</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Comprehensive Macro Breakdown */}
              <div className="bg-brand-cream border border-brand-orange/20 rounded-3xl p-4">
                <h4 className="text-[10px] font-black uppercase text-brand-orange tracking-wider mb-2.5 flex items-center gap-1">
                  <Flame className="w-4 h-4" /> CALORIC & MACRONUTRIENT METRICS
                </h4>
                
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-white rounded-2xl border border-brand-green/5">
                    <span className="text-[9px] text-brand-charcoal/50 font-bold block">CALORIES</span>
                    <span className="text-sm font-black text-brand-charcoal">{selectedQuickView.calories || 350}</span>
                    <span className="text-[8px] text-brand-charcoal/40 block">kcal</span>
                  </div>
                  <div className="p-2 bg-white rounded-2xl border border-brand-green/5">
                    <span className="text-[9px] text-brand-charcoal/50 font-bold block">PROTEIN</span>
                    <span className="text-sm font-black text-brand-green">{selectedQuickView.protein || 25}g</span>
                    <span className="text-[8px] text-brand-charcoal/40 block">{((selectedQuickView.protein || 25)*4)} kcal</span>
                  </div>
                  <div className="p-2 bg-white rounded-2xl border border-brand-green/5">
                    <span className="text-[9px] text-brand-charcoal/50 font-bold block">CARBS</span>
                    <span className="text-sm font-black text-brand-orange">{selectedQuickView.carbs || 30}g</span>
                    <span className="text-[8px] text-brand-charcoal/40 block">{((selectedQuickView.carbs || 30)*4)} kcal</span>
                  </div>
                  <div className="p-2 bg-white rounded-2xl border border-brand-green/5">
                    <span className="text-[9px] text-brand-charcoal/50 font-bold block">FATS</span>
                    <span className="text-sm font-black text-brand-charcoal">{selectedQuickView.fats || 12}g</span>
                    <span className="text-[8px] text-brand-charcoal/40 block">{((selectedQuickView.fats || 12)*9)} kcal</span>
                  </div>
                </div>
              </div>

              {/* Nutritional Details Checklist */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-brand-green/5">
                  <span className="text-brand-charcoal/60 font-bold">Goal Categories</span>
                  <span className="font-extrabold text-brand-green uppercase">{(selectedQuickView.goals || []).join(', ').replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-brand-green/5">
                  <span className="text-brand-charcoal/60 font-bold">Optimal Timing</span>
                  <span className="font-extrabold text-brand-orange uppercase">{(selectedQuickView.timings || []).join(' / ')}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-brand-green/5">
                  <span className="text-brand-charcoal/60 font-bold">Spiciness Level</span>
                  <span className="font-extrabold text-brand-charcoal uppercase">{selectedQuickView.spicyLevel}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-brand-green/5">
                  <span className="text-brand-charcoal/60 font-bold">Allergens</span>
                  <span className="font-extrabold text-rose-600 uppercase">{selectedQuickView.isVeg ? 'Dairy, Gluten' : 'Gluten, Shellfish (Optional)'}</span>
                </div>
              </div>

              {/* Chef Cooking Note */}
              <div className="p-3 bg-brand-green/5 border border-brand-green/10 rounded-2xl flex gap-2">
                <Info className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                <p className="text-[10px] text-brand-charcoal/70 leading-relaxed">
                  <b>Chef's Instruction:</b> Sautéed using certified cold-pressed extra virgin olive oil. High protein retention method locked. No artificial preservatives or monosodium glutamate.
                </p>
              </div>

              {/* Dynamic Customer Reviews & Ratings */}
              <MealReviewsSection meal={selectedQuickView} />
            </div>

            {/* Sticky dialog footer with Action */}
            <div className="p-4 bg-brand-cream border-t border-brand-green/10 shrink-0 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-brand-charcoal/40 block leading-none font-bold">TOTAL PRICE</span>
                <span className="text-xl font-black text-brand-charcoal">₹{selectedQuickView.price}</span>
              </div>

              {selectedQuickView.isAvailable === false ? (
                <button
                  disabled
                  className="px-6 py-3 bg-brand-charcoal/10 text-brand-charcoal/40 font-black text-xs rounded-xl cursor-not-allowed border border-brand-charcoal/5"
                >
                  Item Sold Out
                </button>
              ) : (
                <button
                  onClick={() => {
                    onAddToCart(selectedQuickView);
                    setSelectedQuickView(null);
                  }}
                  className="px-6 py-3 bg-brand-green hover:bg-brand-green/90 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[3.5px]" /> Add To Order
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 6. FLYING PLAYING CARD PORTAL ANIMATION (Turns into card and moves to My Deck in Header) */}
      <AnimatePresence>
        {flyingCards.map((card) => {
          const suits = ['♠', '♥', '♦', '♣'];
          const ranks = ['A', 'K', 'Q', 'J', '10'];
          const suit = suits[Math.abs(card.meal.name.charCodeAt(0)) % 4];
          const rank = ranks[Math.abs(card.meal.name.length) % 5];
          const isRedSuit = suit === '♥' || suit === '♦';

          return (
            <motion.div
              key={card.id}
              initial={{
                position: 'fixed',
                left: card.startX,
                top: card.startY,
                width: card.startWidth,
                height: card.startHeight,
                scale: 1,
                rotateY: 0,
                rotateZ: 0,
                opacity: 1,
                zIndex: 9999,
                pointerEvents: 'none',
              }}
              animate={{
                left: [card.startX, card.startX + (card.targetX - card.startX) * 0.45, card.targetX - 25],
                top: [card.startY, Math.min(card.startY, card.targetY) - 60, card.targetY - 30],
                width: [card.startWidth, card.startWidth * 0.7, 52],
                height: [card.startHeight, card.startHeight * 0.7, 72],
                scale: [1, 1.08, 0.45, 0.1],
                rotateY: [0, 180, 360, 540],
                rotateZ: [0, -12, 18, 0],
                opacity: [1, 1, 0.95, 0],
              }}
              transition={{
                duration: 0.9,
                ease: [0.22, 1, 0.36, 1],
                times: [0, 0.25, 0.75, 1],
              }}
              className="rounded-2xl overflow-hidden border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-white to-amber-100 p-2.5 flex flex-col justify-between shadow-2xl"
              style={{
                boxShadow:
                  '0 20px 40px -10px rgba(245, 158, 11, 0.6), 0 0 30px rgba(245, 158, 11, 0.45)',
              }}
            >
              {/* Playing Card Top Header */}
              <div className="flex justify-between items-start text-xs font-black px-1">
                <div className={isRedSuit ? 'text-rose-600' : 'text-zinc-900'}>
                  <div className="text-sm leading-none font-serif">{rank}</div>
                  <div className="text-xs leading-none">{suit}</div>
                </div>
                <div className="flex items-center gap-1 bg-amber-200/90 border border-amber-400/60 px-2 py-0.5 rounded-full text-[8px] font-black text-amber-950 uppercase tracking-widest shadow-xs">
                  <span>🃏</span>
                  <span>MY DECK</span>
                </div>
                <div className={`text-right ${isRedSuit ? 'text-rose-600' : 'text-zinc-900'}`}>
                  <div className="text-sm leading-none font-serif">{rank}</div>
                  <div className="text-xs leading-none">{suit}</div>
                </div>
              </div>

              {/* Center Artwork / Dish Graphic */}
              <div className="my-1.5 flex-1 relative rounded-xl overflow-hidden border-2 border-amber-400/80 shadow-inner">
                <img
                  src={card.meal.image}
                  alt={card.meal.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2">
                  <div className="w-full">
                    <span className="text-white font-black text-xs block truncate drop-shadow-md">
                      {card.meal.name}
                    </span>
                    <span className="text-[9px] font-extrabold text-amber-300 block">
                      💪 {card.meal.protein || 25}g Protein • {card.meal.calories || 350} kcal
                    </span>
                  </div>
                </div>
              </div>

              {/* Playing Card Footer */}
              <div className="flex justify-between items-center text-[10px] font-black text-amber-950 px-1">
                <span className="bg-amber-200/70 px-1.5 py-0.5 rounded-md">₹{card.meal.price}</span>
                <span className="flex items-center gap-1 text-[9px] text-amber-800">
                  <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500 animate-spin" />
                  Dealt to Deck
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

    </div>
  );
}
