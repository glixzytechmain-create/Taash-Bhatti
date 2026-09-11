/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Plus, Check, ChevronLeft, ChevronRight, X, Flame } from 'lucide-react';
import { Meal, OrderItem } from '../types';
import CartQuantityButton from './CartQuantityButton';

interface GoesWellWithExtensionProps {
  parentMeal: Meal;
  allMeals: Meal[];
  onAddToCart: (meal: Meal) => void;
  cartMealIds?: string[];
  cart?: OrderItem[];
  onUpdateQuantity?: (mealId: string, delta: number) => void;
  onClose?: () => void;
  title?: string;
  className?: string;
  theme?: 'dark' | 'light';
}

export const GoesWellWithExtension: React.FC<GoesWellWithExtensionProps> = ({
  parentMeal,
  allMeals,
  onAddToCart,
  cartMealIds = [],
  cart = [],
  onUpdateQuantity,
  onClose,
  title,
  className = '',
  theme = 'dark',
}) => {
  const [addedMealId, setAddedMealId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Derive paired dishes:
  // 1. Resolve freshest parent meal data from allMeals to react to real-time changes
  // 2. Look up configured goesWellWith IDs
  // 3. Strictly prioritize configured pairings, complementing only if no or single pairing
  const pairedMeals = React.useMemo(() => {
    const liveMeal = allMeals.find((m) => m.id === parentMeal.id) || parentMeal;
    const configuredIds = liveMeal.goesWellWith || [];
    const configuredList = configuredIds
      .map((id) => allMeals.find((m) => m.id === id))
      .filter((m): m is Meal => Boolean(m) && m.id !== liveMeal.id && m.isAvailable !== false);

    if (configuredList.length > 0) {
      // If 1 configured item, add up to 2 smart complements so carousel scrolls well
      if (configuredList.length < 2) {
        const remaining = allMeals.filter(
          (m) =>
            m.id !== liveMeal.id &&
            !configuredList.some((existing) => existing.id === m.id) &&
            m.isAvailable !== false
        );
        const smartComplements = remaining.slice(0, 2);
        return [...configuredList, ...smartComplements];
      }
      return configuredList;
    }

    // Default smart complements if no pairings configured yet
    const remaining = allMeals.filter(
      (m) => m.id !== liveMeal.id && m.isAvailable !== false
    );

    const smartComplements = remaining.sort((a, b) => {
      const aIsDrink = a.timings?.includes('snack') || (a.name.toLowerCase().includes('shake') || a.name.toLowerCase().includes('salad'));
      const bIsDrink = b.timings?.includes('snack') || (b.name.toLowerCase().includes('shake') || b.name.toLowerCase().includes('salad'));
      if (aIsDrink && !bIsDrink) return -1;
      if (!aIsDrink && bIsDrink) return 1;
      return (b.popularity || 0) - (a.popularity || 0);
    });

    return smartComplements.slice(0, 6);
  }, [parentMeal, allMeals]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 220;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleAddPairing = (e: React.MouseEvent, meal: Meal) => {
    e.stopPropagation();
    onAddToCart(meal);
    setAddedMealId(meal.id);
    setTimeout(() => {
      setAddedMealId(null);
    }, 1400);
  };

  if (pairedMeals.length === 0) return null;

  const isDark = theme === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, scale: 0.98 }}
      animate={{ opacity: 1, height: 'auto', scale: 1 }}
      exit={{ opacity: 0, height: 0, scale: 0.98 }}
      transition={{ type: 'spring', damping: 25, stiffness: 280 }}
      className={`overflow-hidden rounded-2xl ${className}`}
    >
      <div
        className={`p-3 sm:p-3.5 border rounded-2xl shadow-xl backdrop-blur-md relative ${
          isDark
            ? 'bg-slate-900/95 border-emerald-500/30 text-white shadow-emerald-950/20'
            : 'bg-emerald-50/90 border-emerald-200 text-brand-charcoal shadow-emerald-100/50'
        }`}
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] sm:text-[11px] font-black tracking-wide uppercase text-emerald-400">
                  {title || 'Goes well with this'}
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Chef&apos;s Pairing
                </span>
              </div>
              <p
                className={`text-[10px] truncate ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                Often ordered with <span className="font-bold">{parentMeal.name.split(' ')[0]}</span>
              </p>
            </div>
          </div>

          {/* Controls: Scroll Buttons & Close */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className={`p-1 rounded-lg border transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700 border-white/10 text-gray-300 hover:text-white'
                  : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-600'
              }`}
              title="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className={`p-1 rounded-lg border transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700 border-white/10 text-gray-300 hover:text-white'
                  : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-600'
              }`}
              title="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={`p-1 rounded-lg border transition-all cursor-pointer ml-1 ${
                  isDark
                    ? 'bg-slate-800/80 hover:bg-rose-950/80 border-white/10 text-gray-400 hover:text-rose-400'
                    : 'bg-white hover:bg-rose-50 border-gray-200 text-gray-400 hover:text-rose-600'
                }`}
                title="Dismiss pairings"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Scrolling Track */}
        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-2.5 overflow-x-auto pb-1 pt-0.5 px-0.5 scrollbar-none snap-x scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {pairedMeals.map((meal) => {
            const isInCart = cartMealIds.includes(meal.id);
            const isJustAdded = addedMealId === meal.id;

            return (
              <div
                key={`pair-${parentMeal.id}-${meal.id}`}
                className={`min-w-[155px] max-w-[175px] sm:min-w-[170px] sm:max-w-[190px] snap-start rounded-xl p-2 flex flex-col justify-between border transition-all shrink-0 ${
                  isDark
                    ? 'bg-slate-800/90 hover:bg-slate-800 border-emerald-500/20 hover:border-emerald-400/50'
                    : 'bg-white hover:bg-white/95 border-emerald-100 hover:border-emerald-300 shadow-xs'
                }`}
              >
                {/* Photo & Badge */}
                <div className="relative rounded-lg overflow-hidden h-24 mb-1.5 shrink-0 bg-slate-950">
                  <img
                    src={meal.image}
                    alt={meal.name}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  {/* Dietary badge */}
                  <div className="absolute bottom-1 left-1 bg-black/75 px-1.5 py-0.5 rounded text-[8px] font-bold text-white flex items-center gap-1 backdrop-blur-xs">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        meal.isVegan
                          ? 'bg-green-400'
                          : meal.isVeg
                          ? 'bg-emerald-400'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span>{meal.isVegan ? 'VEGAN' : meal.isVeg ? 'VEG' : 'NON-VEG'}</span>
                  </div>

                  {/* In Cart Indicator */}
                  {isInCart && (
                    <div className="absolute top-1 right-1 bg-emerald-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> In Cart
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h5
                      className={`font-bold text-[11px] sm:text-xs leading-tight line-clamp-2 ${
                        isDark ? 'text-white' : 'text-brand-charcoal'
                      }`}
                    >
                      {meal.name}
                    </h5>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[9px] font-medium text-emerald-400 flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5 text-amber-400" />
                        {meal.calories || 320} kcal
                      </span>
                      {meal.protein ? (
                        <span className="text-[9px] text-gray-400">• {meal.protein}g Pro</span>
                      ) : null}
                    </div>
                  </div>

                  {/* Price & Add Button */}
                  <div className="mt-2 pt-1.5 border-t border-emerald-500/10 flex items-center justify-between gap-1">
                    <span
                      className={`font-black text-xs ${
                        isDark ? 'text-emerald-300' : 'text-emerald-700'
                      }`}
                    >
                      ₹{meal.price}
                    </span>

                    <CartQuantityButton
                      size="sm"
                      quantity={cart.find((i) => i.meal.id === meal.id)?.quantity || 0}
                      onAdd={() => onAddToCart(meal)}
                      onIncrement={() => (onUpdateQuantity ? onUpdateQuantity(meal.id, 1) : onAddToCart(meal))}
                      onDecrement={() => onUpdateQuantity && onUpdateQuantity(meal.id, -1)}
                      disabled={meal.isAvailable === false}
                      disabledLabel="Sold Out"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
export default GoesWellWithExtension;
