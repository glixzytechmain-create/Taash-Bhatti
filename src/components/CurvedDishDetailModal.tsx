/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
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

const ITEM_WIDTH = 68; // px
const ITEM_GAP = 16;   // px
const ITEM_STRIDE = ITEM_WIDTH + ITEM_GAP; // 84px

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
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastActiveIndexRef = useRef<number>(-1);
  const rafIdRef = useRef<number | null>(null);

  // Mouse drag support for desktop
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);

  // Active index of the selected meal in the lineup
  const activeIndex = useMemo(() => {
    const idx = allMeals.findIndex((m) => m.id === meal.id);
    return idx >= 0 ? idx : 0;
  }, [allMeals, meal.id]);

  // Haptic feedback tick
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch {
        // ignore
      }
    }
  };

  // Subtle acoustic snap tick using Web Audio API
  const playSnapTick = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Graceful no-op if audio context is blocked
    }
  };

  // Dynamic Arch transform updater (runs on animation frame for 60/120fps hardware-accelerated fluid movement)
  const updateItemTransforms = useCallback((scrollPos: number) => {
    allMeals.forEach((_, idx) => {
      const el = itemRefs.current[idx];
      if (!el) return;
      const deltaX = idx * ITEM_STRIDE - scrollPos;
      const normalizedDist = Math.abs(deltaX) / ITEM_STRIDE;
      
      // Convex Parabolic Arch: Peak Y=0 at center view circle, neighbors dip downward
      const translateY = Math.min(28, Math.pow(normalizedDist, 1.45) * 7.2);
      const scale = Math.max(0.74, 1.05 - normalizedDist * 0.12);
      const opacity = Math.max(0.42, 1.0 - normalizedDist * 0.22);

      el.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
      el.style.opacity = `${opacity}`;
    });
  }, [allMeals]);

  // Continuous scroll listener: As user swipes/scrolls, whichever dish enters the View Circle becomes active
  const handleScroll = () => {
    if (!scrollerRef.current) return;
    const scrollPos = scrollerRef.current.scrollLeft;

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      updateItemTransforms(scrollPos);

      // Auto-switch dish when a new item enters the fixed center View Circle
      const closestIdx = Math.max(0, Math.min(allMeals.length - 1, Math.round(scrollPos / ITEM_STRIDE)));
      if (closestIdx !== lastActiveIndexRef.current) {
        lastActiveIndexRef.current = closestIdx;
        const targetMeal = allMeals[closestIdx];
        if (targetMeal && targetMeal.id !== meal.id) {
          onSelectMeal(targetMeal);
          triggerHaptic();
          playSnapTick();
        }
      }
    });
  };

  // Smooth scroll to a specific item index
  const scrollToItem = (idx: number) => {
    if (!scrollerRef.current) return;
    const targetIdx = Math.max(0, Math.min(allMeals.length - 1, idx));
    scrollerRef.current.scrollTo({
      left: targetIdx * ITEM_STRIDE,
      behavior: 'smooth',
    });
  };

  // Initial positioning when modal mounts
  useEffect(() => {
    const initialIdx = allMeals.findIndex((m) => m.id === meal.id);
    const targetIdx = initialIdx >= 0 ? initialIdx : 0;
    lastActiveIndexRef.current = targetIdx;

    if (scrollerRef.current) {
      scrollerRef.current.scrollLeft = targetIdx * ITEM_STRIDE;
      updateItemTransforms(targetIdx * ITEM_STRIDE);
    }

    const handleResize = () => {
      if (scrollerRef.current) {
        updateItemTransforms(scrollerRef.current.scrollLeft);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [allMeals, meal.id, updateItemTransforms]);

  // Keyboard navigation: Left/Right to browse, Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (activeIndex > 0) {
          scrollToItem(activeIndex - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (activeIndex < allMeals.length - 1) {
          scrollToItem(activeIndex + 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, allMeals.length, onClose]);

  // Mouse drag handlers for desktop smooth dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    isMouseDownRef.current = true;
    startXRef.current = e.clientX;
    startScrollLeftRef.current = scrollerRef.current?.scrollLeft || 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || !scrollerRef.current) return;
    const delta = e.clientX - startXRef.current;
    scrollerRef.current.scrollLeft = startScrollLeftRef.current - delta;
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
  };

  // Desktop mouse wheel translation to horizontal scroll
  const handleWheel = (e: React.WheelEvent) => {
    if (!scrollerRef.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      scrollerRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center overflow-hidden animate-in fade-in duration-200">
      
      {/* =========================================================================
          1. AMBIENT ANIMATED BRAND BACKGROUND (Charcoal, Fire Orange, Emerald, Gold)
          ========================================================================= */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-[#0B0F12]/92 backdrop-blur-xl transition-opacity cursor-pointer overflow-hidden"
      >
        {/* Ambient Orb 1: Bhatti Fire Orange Hearth Glow */}
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-[#FF5722]/45 to-[#FF7A00]/30 blur-[100px] pointer-events-none animate-bhatti-aurora-1" />

        {/* Ambient Orb 2: Bhatti Clay Forest Green Glow */}
        <div className="absolute top-1/4 -right-28 w-[480px] h-[480px] rounded-full bg-gradient-to-bl from-[#143D27]/75 to-[#1B5E20]/50 blur-[95px] pointer-events-none animate-bhatti-aurora-2" />

        {/* Ambient Orb 3: Royal Golden Amber Center Radiance */}
        <div className="absolute bottom-1/3 left-1/4 w-[420px] h-[420px] rounded-full bg-gradient-to-r from-[#D4AF37]/40 to-[#F59E0B]/25 blur-[90px] pointer-events-none animate-bhatti-aurora-3" />

        {/* Ambient Orb 4: Tandoor Ember Red Hearth Core */}
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-[#C62828]/35 blur-[85px] pointer-events-none animate-pulse" />

        {/* Rising Micro Embers Particles (480°C Clay Oven Live Ambiance) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Left Flank Embers */}
          <div className="absolute bottom-10 left-[4%] w-2 h-2 rounded-full bg-[#FF5722] shadow-[0_0_8px_#FF5722] animate-bhatti-ember-1" style={{ animationDelay: '0s' }} />
          <div className="absolute bottom-6 left-[8%] w-1.5 h-1.5 rounded-full bg-[#FFD54F] shadow-[0_0_10px_#FFD54F] animate-bhatti-ember-2" style={{ animationDelay: '0.6s' }} />
          <div className="absolute bottom-14 left-[14%] w-2.5 h-2.5 rounded-full bg-[#FF7043] shadow-[0_0_8px_#FF7043] animate-bhatti-ember-3" style={{ animationDelay: '1.2s' }} />
          <div className="absolute bottom-8 left-[20%] w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_6px_#D4AF37] animate-bhatti-ember-1" style={{ animationDelay: '1.8s' }} />
          <div className="absolute bottom-12 left-[28%] w-2 h-2 rounded-full bg-[#FF5722] shadow-[0_0_8px_#FF5722] animate-bhatti-ember-2" style={{ animationDelay: '2.4s' }} />

          {/* Right Flank Embers */}
          <div className="absolute bottom-12 right-[5%] w-2 h-2 rounded-full bg-[#FFD54F] shadow-[0_0_10px_#FFD54F] animate-bhatti-ember-1" style={{ animationDelay: '0.4s' }} />
          <div className="absolute bottom-8 right-[10%] w-2.5 h-2.5 rounded-full bg-[#FF5722] shadow-[0_0_8px_#FF5722] animate-bhatti-ember-2" style={{ animationDelay: '1.0s' }} />
          <div className="absolute bottom-16 right-[16%] w-1.5 h-1.5 rounded-full bg-[#FFAB00] shadow-[0_0_8px_#FFAB00] animate-bhatti-ember-3" style={{ animationDelay: '1.6s' }} />
          <div className="absolute bottom-6 right-[22%] w-2 h-2 rounded-full bg-[#FF7043] shadow-[0_0_6px_#FF7043] animate-bhatti-ember-1" style={{ animationDelay: '2.2s' }} />
          <div className="absolute bottom-10 right-[30%] w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37] animate-bhatti-ember-2" style={{ animationDelay: '2.8s' }} />

          {/* Bottom Center Ambers */}
          <div className="absolute bottom-4 left-[44%] w-1.5 h-1.5 rounded-full bg-[#FFD54F] shadow-[0_0_8px_#FFD54F] animate-bhatti-ember-3" style={{ animationDelay: '0.8s' }} />
          <div className="absolute bottom-5 left-[56%] w-2 h-2 rounded-full bg-[#FF5722] shadow-[0_0_8px_#FF5722] animate-bhatti-ember-1" style={{ animationDelay: '1.4s' }} />
        </div>
      </div>

      {/* =========================================================================
          2. FLOATING DISH CARD (Preserved 100% Rich Information & Functionality)
          ========================================================================= */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative z-20 w-[94%] sm:w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(255,87,34,0.22),0_0_60px_rgba(20,61,39,0.28)] border-t sm:border border-white/25 flex flex-col max-h-[70vh] sm:max-h-[73vh] mb-24 sm:mb-28 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div key={meal.id} className="animate-dish-card-switch flex flex-col flex-1 overflow-hidden">
          
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
      </div>

      {/* =========================================================================
          3. CURVED CONVEYOR DOCK WITH FIXED CENTER VIEW CIRCLE (INSTAMART PARADIGM)
          ========================================================================= */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-2 sm:bottom-4 inset-x-0 z-30 flex flex-col items-center pointer-events-auto px-2 sm:px-4 select-none"
      >
        <div className="relative w-full max-w-xl flex items-center justify-center">
          
          {/* Previous Arrow Button */}
          {activeIndex > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollToItem(activeIndex - 1);
              }}
              aria-label="Previous Dish"
              className="absolute left-1 z-40 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-brand-charcoal/90 hover:bg-black text-white backdrop-blur-md flex items-center justify-center border border-white/20 transition-all shadow-xl active:scale-90 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-amber-400" />
            </button>
          )}

          {/* -------------------------------------------------------------
              A. FIXED CENTER "VIEW CIRCLE" LENS & SPOTLIGHT
              Stationed permanently at the center. Whichever dish enters
              this circle becomes the active selected dish shown above.
              ------------------------------------------------------------- */}
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-1 z-35 flex flex-col items-center">
            {/* Ambient Spotlight Beam projecting upwards to the card */}
            <div className="w-32 sm:w-44 h-24 bg-gradient-to-t from-[#FF5722]/35 via-[#D4AF37]/15 to-transparent blur-md -mb-10 animate-bhatti-spotlight pointer-events-none" />

            {/* The Crisp White View Circle Lens Bezel */}
            <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full border-[3.5px] border-white shadow-[0_0_28px_rgba(255,87,34,0.85),0_0_50px_rgba(212,175,55,0.6),0_10px_25px_rgba(0,0,0,0.9)] animate-view-circle-glow flex items-center justify-center pointer-events-none">
              {/* Inner Golden Reticle Ring */}
              <div className="absolute inset-0.5 rounded-full border border-amber-300/70" />
              {/* Glass Reflection Highlight */}
              <div className="absolute top-1 inset-x-2 h-3 rounded-full bg-gradient-to-b from-white/50 to-transparent" />
            </div>

            {/* Dynamic Dish Title & Price Badge */}
            <div className="mt-2 px-3 py-1 rounded-full bg-brand-charcoal/95 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-amber-400/50 whitespace-nowrap shadow-2xl flex items-center gap-1.5 animate-dish-card-switch pointer-events-none">
              <span className="truncate max-w-[140px] sm:max-w-[200px] text-brand-ivory">{meal.name}</span>
              <span className="text-amber-400 font-extrabold">₹{meal.price}</span>
            </div>
          </div>

          {/* -------------------------------------------------------------
              B. HORIZONTAL CONVEYOR TRACK
              Scrolling / dragging moves dishes through the View Circle.
              ------------------------------------------------------------- */}
          <div 
            ref={scrollerRef}
            onScroll={handleScroll}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className="w-full overflow-x-auto no-scrollbar flex items-center gap-4 py-3 select-none cursor-grab active:cursor-grabbing"
            style={{
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* Left Spacer so item 0 aligns dead-center in the View Circle */}
            <div 
              className="shrink-0 pointer-events-none" 
              style={{ width: 'calc(50% - 34px)' }} 
              aria-hidden="true" 
            />

            {allMeals.map((item, idx) => (
              <div
                key={item.id}
                ref={(el) => { itemRefs.current[idx] = el; }}
                onClick={() => scrollToItem(idx)}
                style={{
                  width: `${ITEM_WIDTH}px`,
                  flexShrink: 0,
                  scrollSnapAlign: 'center',
                  willChange: 'transform, opacity',
                }}
                className="flex flex-col items-center justify-center cursor-pointer select-none py-2"
              >
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-white/50 shadow-lg group">
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
                </div>
              </div>
            ))}

            {/* Right Spacer so item N-1 aligns dead-center in the View Circle */}
            <div 
              className="shrink-0 pointer-events-none" 
              style={{ width: 'calc(50% - 34px)' }} 
              aria-hidden="true" 
            />
          </div>

          {/* Next Arrow Button */}
          {activeIndex < allMeals.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollToItem(activeIndex + 1);
              }}
              aria-label="Next Dish"
              className="absolute right-1 z-40 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-brand-charcoal/90 hover:bg-black text-white backdrop-blur-md flex items-center justify-center border border-white/20 transition-all shadow-xl active:scale-90 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-amber-400" />
            </button>
          )}

        </div>
      </div>

    </div>
  );
}
