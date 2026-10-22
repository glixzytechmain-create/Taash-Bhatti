/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Flame, 
  Info, 
  Sparkles
} from 'lucide-react';
import { Meal, User } from '../types';
import DishMediaGalleryViewer from './DishMediaGalleryViewer';
import CartQuantityButton from './CartQuantityButton';
import MealReviewsSection from './MealReviewsSection';

export interface CurvedDishDetailModalProps {
  meal: Meal;
  allMeals: Meal[];
  onSelectMeal: (meal: Meal) => void;
  onClose: () => void;
  quantity?: number;
  onAddToCart: (meal: Meal) => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  likedMeals?: string[];
  onToggleLike?: (mealId: string) => void;
  currentUser?: User;
  onUpdateMealRating?: (mealId: string, rating: number, count: number) => void;
}

export default function CurvedDishDetailModal({
  meal,
  allMeals,
  onSelectMeal,
  onClose,
  quantity = 0,
  onAddToCart,
  onIncrement,
  onDecrement,
  likedMeals = [],
  onToggleLike,
  currentUser,
  onUpdateMealRating,
}: CurvedDishDetailModalProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Find active index in lineup
  const activeIndex = useMemo(() => {
    const idx = allMeals.findIndex((m) => m.id === meal.id);
    return idx >= 0 ? idx : 0;
  }, [allMeals, meal.id]);

  // Center the active circle in the curved scroller whenever activeIndex changes
  useEffect(() => {
    if (itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeIndex]);

  // Keyboard navigation: Left/Right to browse, Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (activeIndex > 0) {
          onSelectMeal(allMeals[activeIndex - 1]);
        }
      } else if (e.key === 'ArrowRight') {
        if (activeIndex < allMeals.length - 1) {
          onSelectMeal(allMeals[activeIndex + 1]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, allMeals, onClose, onSelectMeal]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIndex > 0) {
      onSelectMeal(allMeals[activeIndex - 1]);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIndex < allMeals.length - 1) {
      onSelectMeal(allMeals[activeIndex + 1]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center overflow-hidden animate-in fade-in duration-200">
      
      {/* =========================================================================
          1. AMBIENT ANIMATED BRAND BACKGROUND (Charcoal, Fire Orange, Emerald, Gold)
          ========================================================================= */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-[#0E1317]/88 backdrop-blur-md transition-opacity cursor-pointer overflow-hidden"
      >
        {/* Ambient Orb 1: Fire Orange / Clay Hearth Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#FF5722]/18 blur-3xl pointer-events-none animate-ambient-drift-1" />

        {/* Ambient Orb 2: Forest Green / Healing Herbs Glow */}
        <div className="absolute -bottom-28 -right-28 w-96 h-96 rounded-full bg-[#143D27]/40 blur-3xl pointer-events-none animate-ambient-drift-2" />

        {/* Ambient Orb 3: Golden Embers Center Radiance */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-[#D4AF37]/12 blur-3xl pointer-events-none animate-pulse" />

        {/* Rising Micro Embers Particles (480°C Clay Oven Ambiance) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-75">
          <div className="absolute bottom-6 left-[15%] w-1.5 h-1.5 rounded-full bg-amber-400 blur-[0.5px] animate-ember-1" />
          <div className="absolute bottom-12 left-[38%] w-2 h-2 rounded-full bg-orange-500 blur-[0.5px] animate-ember-2" />
          <div className="absolute bottom-4 left-[62%] w-1.5 h-1.5 rounded-full bg-amber-300 blur-[0.5px] animate-ember-3" />
          <div className="absolute bottom-10 left-[84%] w-2 h-2 rounded-full bg-red-400 blur-[0.5px] animate-ember-4" />
        </div>
      </div>

      {/* =========================================================================
          2. FLOATING DISH CARD (Preserved 100% Rich Information & Functionality)
          ========================================================================= */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative z-20 w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl border-t sm:border border-brand-green/10 flex flex-col max-h-[72vh] sm:max-h-[75vh] mb-20 sm:mb-24 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Interactive Multi-Media Lineup Header (Videos + Photos) */}
        <DishMediaGalleryViewer
          meal={meal}
          onClose={onClose}
          showCloseButton={true}
          bottomLeftBadge={
            meal.rating && meal.rating > 0 ? (
              <div className="bg-brand-charcoal/90 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md border border-white/10">
                <Star className="w-3.5 h-3.5 text-brand-orange fill-brand-orange" />
                {meal.rating.toFixed(1)} {meal.reviewsCount ? `(${meal.reviewsCount})` : ''}
              </div>
            ) : null
          }
          bottomRightAction={
            onToggleLike ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike(meal.id);
                }}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase flex items-center gap-1.5 shadow-md transition-all cursor-pointer backdrop-blur-md active:scale-95 ${
                  likedMeals.includes(meal.id)
                    ? 'bg-amber-500 text-white border-amber-300'
                    : 'bg-white/90 text-brand-charcoal border-white/60 hover:bg-white'
                }`}
              >
                <span>🃏</span>
                <span>{likedMeals.includes(meal.id) ? 'In My Deck' : 'Add to Deck'}</span>
              </button>
            ) : null
          }
        />

        {/* Scrollable details container */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div>
            <div className="flex gap-2 mb-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${meal.isVegan ? 'bg-green-500' : meal.isVeg ? 'bg-emerald-500' : 'bg-red-500'} inline-block my-auto`} />
              <span className="text-[10px] font-black uppercase text-brand-charcoal/50 tracking-wider">
                {meal.isVegan ? 'Vegan Delight' : meal.isVeg ? 'Pure Vegetarian' : 'Non-Vegetarian'}
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-brand-charcoal leading-tight">
              {meal.name}
            </h3>
            <p className="text-xs text-brand-charcoal/70 mt-2 leading-relaxed">
              {meal.description}
            </p>
          </div>

          {/* Dish Specifications Block */}
          <div className="bg-brand-cream border border-brand-orange/20 rounded-3xl p-4">
            <h4 className="text-[10px] font-black uppercase text-brand-orange tracking-wider mb-2.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> DISH SPECIFICATIONS
            </h4>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-white rounded-2xl border border-brand-green/5">
                <span className="text-[9px] text-brand-charcoal/50 font-bold block">PREP TIME</span>
                <span className="text-sm font-black text-brand-charcoal">{meal.prepTimeMinutes || 20} min</span>
              </div>
              <div className="p-2 bg-white rounded-2xl border border-brand-green/5">
                <span className="text-[9px] text-brand-charcoal/50 font-bold block">SPICINESS</span>
                <span className="text-sm font-black text-brand-orange capitalize">{meal.spicyLevel || 'Mild'}</span>
              </div>
              <div className="p-2 bg-white rounded-2xl border border-brand-green/5">
                <span className="text-[9px] text-brand-charcoal/50 font-bold block">RATING</span>
                <span className="text-sm font-black text-brand-green">
                  {meal.rating && meal.rating > 0 ? `★ ${meal.rating.toFixed(1)}` : 'New Dish'}
                </span>
              </div>
            </div>
          </div>

          {/* Caloric & Macronutrient Metrics */}
          <div className="bg-brand-cream/60 border border-brand-green/10 rounded-3xl p-4">
            <h4 className="text-[10px] font-black uppercase text-brand-green tracking-wider mb-2.5 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-brand-orange" /> CALORIC & MACRONUTRIENT METRICS
            </h4>
            
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-white rounded-2xl border border-brand-green/5">
                <span className="text-[9px] text-brand-charcoal/50 font-bold block">CALORIES</span>
                <span className="text-sm font-black text-brand-charcoal">{meal.calories || 350}</span>
                <span className="text-[8px] text-brand-charcoal/40 block">kcal</span>
              </div>
              <div className="p-2 bg-white rounded-2xl border border-brand-green/5">
                <span className="text-[9px] text-brand-charcoal/50 font-bold block">PROTEIN</span>
                <span className="text-sm font-black text-brand-green">{meal.protein || 24}g</span>
                <span className="text-[8px] text-brand-charcoal/40 block">{((meal.protein || 24) * 4)} kcal</span>
              </div>
              <div className="p-2 bg-white rounded-2xl border border-brand-green/5">
                <span className="text-[9px] text-brand-charcoal/50 font-bold block">CARBS</span>
                <span className="text-sm font-black text-brand-orange">{meal.carbs || 30}g</span>
                <span className="text-[8px] text-brand-charcoal/40 block">{((meal.carbs || 30) * 4)} kcal</span>
              </div>
              <div className="p-2 bg-white rounded-2xl border border-brand-green/5">
                <span className="text-[9px] text-brand-charcoal/50 font-bold block">FATS</span>
                <span className="text-sm font-black text-brand-charcoal">{meal.fats || 12}g</span>
                <span className="text-[8px] text-brand-charcoal/40 block">{((meal.fats || 12) * 9)} kcal</span>
              </div>
            </div>
          </div>

          {/* Ingredients list if present */}
          {meal.ingredients && meal.ingredients.length > 0 && (
            <div className="bg-brand-cream/40 border border-brand-green/10 rounded-2xl p-3.5">
              <h4 className="text-[10px] font-black uppercase text-brand-green tracking-wider mb-2 flex items-center gap-1">
                <span>🌾 KEY INGREDIENTS</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {meal.ingredients.map((ing, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-white rounded-lg text-[10px] font-bold text-brand-charcoal border border-brand-green/10 shadow-2xs"
                  >
                    {ing.name} ({ing.grams}g)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Checklist & Timings */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-brand-green/5">
              <span className="text-brand-charcoal/60 font-bold">Serving Time</span>
              <span className="font-extrabold text-brand-orange uppercase">{(meal.timings || ['All Day']).join(' / ')}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-brand-green/5">
              <span className="text-brand-charcoal/60 font-bold">Category</span>
              <span className="font-extrabold text-brand-green uppercase">{meal.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}</span>
            </div>
          </div>

          {/* Chef Cooking Instruction */}
          <div className="p-3 bg-brand-green/5 border border-brand-green/10 rounded-2xl flex gap-2">
            <Info className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
            <p className="text-[10px] text-brand-charcoal/70 leading-relaxed">
              <b>Chef's Clay-Oven Standard:</b> Cooked inside our 480°C tandoor with certified cold-pressed oils. High protein & nutritional retention locked without artificial additives.
            </p>
          </div>

          {/* Dynamic Customer Reviews & Ratings */}
          <MealReviewsSection
            meal={meal}
            currentUser={currentUser}
            onUpdateMealRating={onUpdateMealRating}
          />
        </div>

        {/* Sticky dialog footer with Action */}
        <div className="p-4 bg-brand-cream border-t border-brand-green/10 shrink-0 flex items-center justify-between">
          <div>
            <span className="text-[9px] text-brand-charcoal/40 block leading-none font-bold">TOTAL PRICE</span>
            <span className="text-xl font-black text-brand-charcoal">₹{meal.price}</span>
          </div>

          <CartQuantityButton
            quantity={quantity}
            onAdd={() => onAddToCart(meal)}
            onIncrement={onIncrement || (() => onAddToCart(meal))}
            onDecrement={onDecrement}
            disabled={meal.isAvailable === false}
            disabledLabel="Item Sold Out"
            addLabel="Add To Order"
          />
        </div>
      </div>

      {/* =========================================================================
          3. CURVED HORIZONTAL SCROLLER (Instamart Pattern with Parabolic Arc)
          ========================================================================= */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-2 sm:bottom-4 inset-x-0 z-30 flex flex-col items-center pointer-events-auto px-2 sm:px-4 select-none"
      >
        {/* Navigation Wrapper with subtle Prev/Next Chevrons */}
        <div className="relative w-full max-w-lg flex items-center justify-center">
          
          {/* Previous Arrow Button */}
          {activeIndex > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Dish"
              className="absolute left-1 z-30 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center border border-white/20 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Curved Track Container */}
          <div 
            ref={scrollerRef}
            className="w-full overflow-x-auto no-scrollbar scroll-smooth flex items-end justify-start sm:justify-center gap-3 sm:gap-4 px-12 py-3"
            style={{
              scrollSnapType: 'x mandatory',
              perspective: '800px',
            }}
          >
            {allMeals.map((item, idx) => {
              const delta = idx - activeIndex;
              const isCenter = delta === 0;

              // Parabolic curve vertical offset (∩ shape): Center is highest (0px), neighbors dip downwards
              const absDelta = Math.abs(delta);
              const translateY = Math.min(26, Math.pow(absDelta, 1.45) * 6.2);
              
              // Scale factor: Center is prominent (1.0), neighbors taper off smoothly
              const scale = isCenter ? 1.05 : absDelta === 1 ? 0.9 : Math.max(0.76, 0.9 - absDelta * 0.08);
              const opacity = isCenter ? 1 : absDelta === 1 ? 0.85 : 0.65;

              return (
                <div
                  key={item.id}
                  style={{
                    scrollSnapAlign: 'center',
                    transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
                    transition: 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s ease',
                    opacity,
                  }}
                  className="flex-shrink-0 flex flex-col items-center"
                >
                  <button
                    ref={(el) => (itemRefs.current[idx] = el)}
                    type="button"
                    onClick={() => onSelectMeal(item)}
                    title={item.name}
                    className={`relative rounded-full transition-all cursor-pointer flex items-center justify-center group overflow-hidden ${
                      isCenter
                        ? 'w-16 h-16 sm:w-18 sm:h-18 border-[3.5px] border-white ring-2 ring-amber-400 shadow-[0_0_24px_rgba(255,87,34,0.6)] animate-curved-center-halo'
                        : 'w-12 h-12 sm:w-13 sm:h-13 border-2 border-white/50 hover:border-white shadow-md hover:scale-105'
                    }`}
                  >
                    {/* Dish circular photo */}
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-full pointer-events-none group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Veg / Non-Veg Mini Status Dot */}
                    <span 
                      className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-white shadow-xs ${
                        item.isVegan ? 'bg-green-500' : item.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                      }`} 
                    />

                    {/* Dark gradient vignette */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  </button>

                  {/* Active Dish Name / Price Tooltip Tag */}
                  {isCenter && (
                    <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-black/85 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider border border-white/20 whitespace-nowrap shadow-lg flex items-center gap-1 animate-in fade-in duration-200">
                      <span className="truncate max-w-[120px]">{item.name}</span>
                      <span className="text-amber-400">₹{item.price}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Next Arrow Button */}
          {activeIndex < allMeals.length - 1 && (
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Dish"
              className="absolute right-1 z-30 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center border border-white/20 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

        </div>
      </div>

    </div>
  );
}
