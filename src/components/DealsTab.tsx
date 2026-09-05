/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Tag, 
  Sparkles, 
  ChevronRight, 
  Check, 
  Plus, 
  Layers, 
  Gift, 
  Zap, 
  Percent, 
  Box, 
  ArrowRight, 
  Flame, 
  Clock, 
  Info, 
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { DealOffer, DealStep, Meal, OrderItem, DealStepSelection } from '../types';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface DealsTabProps {
  meals: Meal[];
  onAddToCart: (item: OrderItem) => void;
  onOpenAdminPortal?: () => void;
  isAdmin?: boolean;
}

export default function DealsTab({ meals, onAddToCart, onOpenAdminPortal, isAdmin }: DealsTabProps) {
  const [deals, setDeals] = useState<DealOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  
  // Interactive Modals State
  const [activeDeckDeal, setActiveDeckDeal] = useState<DealOffer | null>(null);
  const [activeBogoDeal, setActiveBogoDeal] = useState<DealOffer | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Deck Builder Wizard State
  const [currentDeckStepIdx, setCurrentDeckStepIdx] = useState<number>(0);
  const [deckSelections, setDeckSelections] = useState<{ [stepId: string]: Meal[] }>({});

  // BOGO Builder State
  const [selectedBogoPrimary, setSelectedBogoPrimary] = useState<Meal | null>(null);
  const [selectedBogoReward, setSelectedBogoReward] = useState<Meal | null>(null);

  // Real-time Firestore sync for Deals
  useEffect(() => {
    const q = query(collection(db, 'deals'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedDeals: DealOffer[] = [];
        snapshot.forEach((docSnap) => {
          fetchedDeals.push({ id: docSnap.id, ...docSnap.data() } as DealOffer);
        });
        // Sort by priorityOrder or active status
        fetchedDeals.sort((a, b) => (a.priorityOrder || 1) - (b.priorityOrder || 1));
        setDeals(fetchedDeals);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to deals:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      // Must be active for diner view
      if (!deal.isActive && !isAdmin) return false;

      if (activeFilter !== 'all') {
        if (activeFilter === 'veg' && deal.dietaryType !== 'veg') return false;
        if (activeFilter !== 'veg' && deal.offerType !== activeFilter) return false;
      }

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesTitle = deal.title?.toLowerCase().includes(q);
        const matchesTag = deal.tagline?.toLowerCase().includes(q);
        const matchesDesc = deal.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesTag && !matchesDesc) return false;
      }

      return true;
    });
  }, [deals, activeFilter, searchQuery, isAdmin]);

  // Open Deck Builder Wizard
  const handleOpenDeckBuilder = (deal: DealOffer) => {
    setActiveDeckDeal(deal);
    setCurrentDeckStepIdx(0);
    // Initialize empty selections for all steps
    const initialSelections: { [stepId: string]: Meal[] } = {};
    (deal.steps || []).forEach((step) => {
      initialSelections[step.id] = [];
    });
    setDeckSelections(initialSelections);
  };

  // Open BOGO Selector
  const handleOpenBogoSelector = (deal: DealOffer) => {
    setActiveBogoDeal(deal);
    setSelectedBogoPrimary(null);
    setSelectedBogoReward(null);
  };

  // Toggle meal selection in deck builder step
  const handleToggleMealInDeckStep = (step: DealStep, meal: Meal) => {
    const currentList = deckSelections[step.id] || [];
    const alreadySelected = currentList.some((m) => m.id === meal.id);

    if (alreadySelected) {
      setDeckSelections({
        ...deckSelections,
        [step.id]: currentList.filter((m) => m.id !== meal.id),
      });
    } else {
      if (currentList.length >= step.maxSelection) {
        // If maxSelection is 1, replace selection
        if (step.maxSelection === 1) {
          setDeckSelections({
            ...deckSelections,
            [step.id]: [meal],
          });
        } else {
          showToast(`You can select at most ${step.maxSelection} item(s) for this course.`);
        }
      } else {
        setDeckSelections({
          ...deckSelections,
          [step.id]: [...currentList, meal],
        });
      }
    }
  };

  // Finalize Custom Deck & Add to Cart
  const handleAddCustomDeckToCart = () => {
    if (!activeDeckDeal) return;

    // Validate all steps meet minSelection
    const steps = activeDeckDeal.steps || [];
    for (const step of steps) {
      const selectedForStep = deckSelections[step.id] || [];
      if (selectedForStep.length < step.minSelection) {
        showToast(`Please complete "${step.title}" (Select at least ${step.minSelection} item)`);
        return;
      }
    }

    // Build Step Selection details
    const selectedStepsData: DealStepSelection[] = steps.map((s) => ({
      stepId: s.id,
      stepTitle: s.title,
      items: (deckSelections[s.id] || []).map((m) => ({
        mealId: m.id,
        mealName: m.name,
        price: m.price,
        quantity: 1,
        isVeg: m.isVeg,
        image: m.image,
      })),
    }));

    // Aggregate summary
    const allSelectedMeals: Meal[] = (Object.values(deckSelections) as Meal[][]).flat();
    const sumCalories = allSelectedMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const sumProtein = allSelectedMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
    const sumCarbs = allSelectedMeals.reduce((sum, m) => sum + (m.carbs || 0), 0);
    const sumFats = allSelectedMeals.reduce((sum, m) => sum + (m.fats || 0), 0);
    const isAllVeg = allSelectedMeals.every((m) => m.isVeg);

    // Create synthesized Meal representation for consistent rendering
    const customDeckMeal: Meal = {
      id: `custom-deck-${Date.now()}`,
      name: activeDeckDeal.title,
      description: `Custom 4-Course Royal Box: ${allSelectedMeals.map((m) => m.name).join(', ')}`,
      price: activeDeckDeal.packagePrice,
      calories: sumCalories,
      protein: sumProtein,
      carbs: sumCarbs,
      fats: sumFats,
      isVeg: isAllVeg,
      spicyLevel: 'medium',
      timings: activeDeckDeal.validTimings || ['lunch', 'dinner'],
      goals: ['muscle_gain', 'maintenance'],
      image: activeDeckDeal.image || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      popularity: 99,
      partnerGymExclusive: false,
    };

    const orderItem: OrderItem = {
      meal: customDeckMeal,
      quantity: 1,
      isDeal: true,
      dealId: activeDeckDeal.id,
      dealTitle: activeDeckDeal.title,
      dealType: 'build_your_deck',
      dealSelectedSteps: selectedStepsData,
      packagePrice: activeDeckDeal.packagePrice,
    };

    onAddToCart(orderItem);
    setActiveDeckDeal(null);
    showToast(`Added "${activeDeckDeal.title}" to your order tray! 🍱`);
  };

  // Add 1-Tap Fixed Combo to Cart
  const handleAddFixedComboToCart = (deal: DealOffer) => {
    const comboItems = deal.comboItems || [];
    if (comboItems.length === 0) return;

    const includedMeals = comboItems.map((ci) => {
      const found = meals.find((m) => m.id === ci.mealId);
      return {
        meal: found,
        quantity: ci.quantity,
      };
    }).filter((x) => x.meal !== undefined);

    const summaryStr = includedMeals.map((x) => `${x.quantity}x ${x.meal?.name}`).join(' + ');
    const isAllVeg = includedMeals.every((x) => x.meal?.isVeg);

    const comboMeal: Meal = {
      id: `combo-package-${deal.id}`,
      name: deal.title,
      description: deal.tagline || `Combo Package: ${summaryStr}`,
      price: deal.packagePrice,
      calories: includedMeals.reduce((sum, x) => sum + (x.meal?.calories || 0) * x.quantity, 0),
      protein: includedMeals.reduce((sum, x) => sum + (x.meal?.protein || 0) * x.quantity, 0),
      carbs: includedMeals.reduce((sum, x) => sum + (x.meal?.carbs || 0) * x.quantity, 0),
      fats: includedMeals.reduce((sum, x) => sum + (x.meal?.fats || 0) * x.quantity, 0),
      isVeg: isAllVeg,
      spicyLevel: 'medium',
      timings: deal.validTimings || ['lunch', 'dinner'],
      goals: ['muscle_gain', 'maintenance'],
      image: deal.image || 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
      popularity: 95,
      partnerGymExclusive: false,
    };

    const orderItem: OrderItem = {
      meal: comboMeal,
      quantity: 1,
      isDeal: true,
      dealId: deal.id,
      dealTitle: deal.title,
      dealType: 'fixed_combo',
      dealComboItemsSummary: summaryStr,
      packagePrice: deal.packagePrice,
    };

    onAddToCart(orderItem);
    showToast(`Added combo package "${deal.title}" to cart! 🍱`);
  };

  // Add BOGO Bundle to Cart
  const handleAddBogoToCart = () => {
    if (!activeBogoDeal || !selectedBogoPrimary || !selectedBogoReward) {
      showToast('Please select both your primary dish and your complimentary reward dish.');
      return;
    }

    const isAllVeg = selectedBogoPrimary.isVeg && selectedBogoReward.isVeg;
    const summaryStr = `1x ${selectedBogoPrimary.name} + 1x ${selectedBogoReward.name} (Complimentary)`;

    const bogoMeal: Meal = {
      id: `bogo-deal-${activeBogoDeal.id}`,
      name: activeBogoDeal.title,
      description: `BOGO Package: ${summaryStr}`,
      price: activeBogoDeal.packagePrice,
      calories: (selectedBogoPrimary.calories || 0) + (selectedBogoReward.calories || 0),
      protein: (selectedBogoPrimary.protein || 0) + (selectedBogoReward.protein || 0),
      carbs: (selectedBogoPrimary.carbs || 0) + (selectedBogoReward.carbs || 0),
      fats: (selectedBogoPrimary.fats || 0) + (selectedBogoReward.fats || 0),
      isVeg: isAllVeg,
      spicyLevel: 'medium',
      timings: activeBogoDeal.validTimings || ['lunch', 'dinner'],
      goals: ['muscle_gain', 'maintenance'],
      image: activeBogoDeal.image,
      popularity: 98,
      partnerGymExclusive: false,
    };

    const orderItem: OrderItem = {
      meal: bogoMeal,
      quantity: 1,
      isDeal: true,
      dealId: activeBogoDeal.id,
      dealTitle: activeBogoDeal.title,
      dealType: 'bogo',
      dealComboItemsSummary: summaryStr,
      packagePrice: activeBogoDeal.packagePrice,
    };

    onAddToCart(orderItem);
    setActiveBogoDeal(null);
    showToast(`BOGO Offer added to cart! 🎁`);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-brand-charcoal border border-brand-orange text-white text-xs font-bold shadow-2xl flex items-center gap-2 shadow-brand-orange/20"
          >
            <Sparkles className="w-4 h-4 text-brand-orange" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header Section */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#10171D] via-[#16202A] to-[#121A22] border border-brand-green/25 p-6 sm:p-8 shadow-2xl">
        {/* Subtle Ambient Radial Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-amber-500/15 via-brand-orange/5 to-transparent pointer-events-none blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-radial from-emerald-500/10 via-transparent to-transparent pointer-events-none blur-xl" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3.5 py-1 rounded-full bg-gradient-to-r from-brand-orange via-amber-500 to-amber-400 text-brand-charcoal font-black text-[10px] uppercase tracking-wider shadow-lg flex items-center gap-1.5 ring-1 ring-amber-300/40">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>Royal Bhatti Deals Zone</span>
            </span>
            <span className="text-xs text-amber-300/90 font-bold flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Curated Master Chef Combos & Deck Boxes</span>
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              Handcrafted Deck Boxes & Royal Combo Feasts
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-2xl">
              Build your customized 4-course tandoor banquet, unlock Buy 1 Get 1 privileges, or order chef-curated combos with exclusive package savings.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-4 text-[11px] text-stone-300">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% Fresh Clay-Oven Cooked</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 font-bold">
              <Percent className="w-3.5 h-3.5" />
              <span>Bundled Package Savings Guaranteed</span>
            </div>
            <div className="flex items-center gap-1 text-stone-400 text-[10px] sm:text-xs">
              <Info className="w-3.5 h-3.5 text-stone-400" />
              <span>Exclusive Pricing (Coupons Exempt)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Deals', icon: Layers },
            { id: 'build_your_deck', label: '📦 Build Your Deck', icon: Box },
            { id: 'fixed_combo', label: '🍱 Fixed Combos', icon: Tag },
            { id: 'bogo', label: '🎁 Buy 1 Get 1', icon: Gift },
            { id: 'flash_deal', label: '⚡ Flash Deals', icon: Zap },
            { id: 'veg', label: '🥗 Pure Veg', icon: Flame },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFilter === tab.id;
            return (
              <motion.button
                key={tab.id}
                id={`deal-filter-${tab.id}`}
                onClick={() => setActiveFilter(tab.id)}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-orange to-amber-500 text-brand-charcoal font-black shadow-lg shadow-brand-orange/25 ring-2 ring-brand-orange/30'
                    : 'bg-white/90 hover:bg-white text-stone-700 border border-stone-200/90 shadow-xs'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="w-full sm:w-72 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deals, dishes, or combos..."
            className="w-full bg-white/95 border border-stone-200 rounded-2xl pl-4 pr-9 py-2 text-xs text-brand-charcoal placeholder-stone-400 focus:outline-none focus:border-brand-orange shadow-xs transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-brand-green/10 animate-pulse space-y-4">
              <div className="h-44 bg-gray-200 rounded-2xl" />
              <div className="h-5 bg-gray-200 rounded-md w-3/4" />
              <div className="h-4 bg-gray-100 rounded-md w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredDeals.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-dashed border-brand-green/30 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-brand-orange/10 mx-auto flex items-center justify-center text-3xl">
            🔥
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-brand-charcoal">No Active Deals Right Now</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Our master chefs are curating today's live clay-oven combo packages and BOGO specials. Check back shortly!
            </p>
          </div>
          {isAdmin && onOpenAdminPortal && (
            <div className="pt-2">
              <button
                onClick={onOpenAdminPortal}
                className="px-5 py-2.5 rounded-xl bg-brand-green text-brand-charcoal font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-md"
              >
                ⚙️ Open Admin Deals Studio to Publish Deals
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Deals Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {filteredDeals.map((deal) => {
            const isDeck = deal.offerType === 'build_your_deck';
            const isCombo = deal.offerType === 'fixed_combo';
            const isBogo = deal.offerType === 'bogo';
            const isExpanded = expandedCardId === deal.id;
            const savingsAmount = deal.originalPrice && deal.originalPrice > deal.packagePrice 
              ? deal.originalPrice - deal.packagePrice 
              : 0;

            return (
              <motion.div
                key={deal.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="bg-white/95 border border-stone-200/90 rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group relative"
              >
                {/* Image & Badges */}
                <div className="relative h-52 w-full bg-stone-900 overflow-hidden">
                  <img
                    src={deal.image}
                    alt={deal.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  
                  {/* Badge Pills */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5 pointer-events-none">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {deal.badge && (
                        <span className="px-3 py-1 rounded-full bg-gradient-to-r from-brand-orange to-amber-500 text-brand-charcoal font-black text-[10px] uppercase tracking-wider shadow-md ring-1 ring-white/20">
                          {deal.badge}
                        </span>
                      )}
                      {deal.discountPct && deal.discountPct > 0 ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider shadow-md">
                          SAVE {deal.discountPct}%
                        </span>
                      ) : null}
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-stone-900/80 backdrop-blur-md text-stone-200 text-[10px] font-mono font-bold uppercase tracking-wider border border-white/15">
                      {isDeck ? '📦 Multi-Step Deck' : isCombo ? '🍱 1-Tap Feast' : isBogo ? '🎁 BOGO Deal' : '⚡ Flash Offer'}
                    </span>
                  </div>

                  {/* Pricing on bottom of image */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white pointer-events-none">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono drop-shadow-md">₹{deal.packagePrice}</span>
                        {deal.originalPrice && deal.originalPrice > deal.packagePrice && (
                          <span className="text-xs text-stone-300 line-through font-mono">₹{deal.originalPrice}</span>
                        )}
                      </div>
                      {savingsAmount > 0 && (
                        <span className="text-[10px] text-emerald-300 font-bold block drop-shadow-xs">
                          Diner Saves ₹{savingsAmount} (Guaranteed)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-[10px] text-amber-300 font-bold">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Chef Special</span>
                    </div>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <h3 className="text-base sm:text-lg font-black text-brand-charcoal leading-snug group-hover:text-brand-orange transition-colors">
                      {deal.title}
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                      {deal.tagline || deal.description}
                    </p>

                    {/* Interactive Expandable Preview Toggle */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setExpandedCardId(isExpanded ? null : deal.id)}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer transition-colors py-1"
                      >
                        <span>{isExpanded ? 'Hide Courses & Inclusions' : "View What's Included Inside"}</span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    </div>

                    {/* Expandable Course & Item Breakdown */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden pt-2 space-y-2.5 border-t border-stone-200/80"
                        >
                          {/* Step Previews for 'build_your_deck' */}
                          {isDeck && deal.steps && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                                🍱 4 Step-by-Step Courses:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {deal.steps.map((s, idx) => (
                                  <div key={s.id || idx} className="bg-stone-50 rounded-xl p-2 border border-stone-200 text-[10px]">
                                    <span className="font-bold text-stone-800 block truncate">{s.title}</span>
                                    <span className="text-stone-500">{s.eligibleMealIds?.length || 0} delicious options</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Combo Included Items Preview */}
                          {isCombo && deal.comboItems && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block">
                                Handpicked Inclusions:
                              </span>
                              <div className="space-y-1 bg-stone-50 p-2 rounded-xl border border-stone-200">
                                {deal.comboItems.map((ci, idx) => {
                                  const found = meals.find((m) => m.id === ci.mealId);
                                  return (
                                    <div key={ci.mealId || idx} className="text-xs text-stone-700 flex items-center justify-between">
                                      <span className="font-medium truncate pr-2">• {ci.quantity}x {found?.name || ci.mealName || ci.mealId}</span>
                                      <span className="text-[10px] font-mono text-stone-500 font-bold">₹{found ? found.price * ci.quantity : 0}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* BOGO Rules Preview */}
                          {isBogo && (
                            <div className="text-xs text-amber-950 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80 space-y-1">
                              <p className="font-bold flex items-center gap-1 text-amber-900">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                <span>Buy 1 Signature Platter</span>
                              </p>
                              <p className="text-[11px] text-stone-700">Unlock 1 Complimentary Dish at <b>{deal.bogoDiscountPct || 100}% OFF ($0)</b></p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Primary CTA Buttons with playful spring bounce */}
                  <div className="pt-3">
                    {isDeck ? (
                      <motion.button
                        type="button"
                        id={`btn-build-deck-${deal.id}`}
                        onClick={() => handleOpenDeckBuilder(deal)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-brand-orange via-amber-500 to-amber-400 text-brand-charcoal font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-105 active:scale-98 transition-all cursor-pointer shadow-lg shadow-brand-orange/20 ring-1 ring-amber-300/30"
                      >
                        <Box className="w-4 h-4 text-brand-charcoal stroke-[2.5]" />
                        <span>Customize 4-Course Box ➜</span>
                      </motion.button>
                    ) : isBogo ? (
                      <motion.button
                        type="button"
                        id={`btn-select-bogo-${deal.id}`}
                        onClick={() => handleOpenBogoSelector(deal)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-brand-charcoal font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-105 active:scale-98 transition-all cursor-pointer shadow-md"
                      >
                        <Gift className="w-4 h-4 text-brand-charcoal stroke-[2.5]" />
                        <span>Claim BOGO Platter ➜</span>
                      </motion.button>
                    ) : (
                      <motion.button
                        type="button"
                        id={`btn-add-combo-${deal.id}`}
                        onClick={() => handleAddFixedComboToCart(deal)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                        className="w-full py-3 px-4 rounded-2xl bg-brand-green text-brand-charcoal font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-105 active:scale-98 transition-all cursor-pointer shadow-md ring-1 ring-brand-green/30"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Add Combo Package (₹{deal.packagePrice})</span>
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* INTERACTIVE MULTI-STEP BUILD YOUR OWN DECK MODAL */}
      <AnimatePresence>
        {activeDeckDeal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden border border-brand-green/20"
            >
              {/* Modal Top Header */}
              <div className="p-5 sm:p-6 border-b border-brand-green/10 bg-brand-cream/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-orange text-brand-charcoal flex items-center justify-center shadow-md">
                    <Box className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-brand-charcoal uppercase tracking-tight">
                      {activeDeckDeal.title}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Step {currentDeckStepIdx + 1} of {activeDeckDeal.steps?.length || 1}:{' '}
                      {activeDeckDeal.steps?.[currentDeckStepIdx]?.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs text-gray-400 block font-bold">Package Price</span>
                    <span className="text-base font-black text-brand-green font-mono">₹{activeDeckDeal.packagePrice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveDeckDeal(null)}
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Step Progress Tracker */}
              <div className="px-6 py-3 bg-brand-cream/40 border-b border-brand-green/10 flex items-center justify-between shrink-0 overflow-x-auto">
                {(activeDeckDeal.steps || []).map((step, idx) => {
                  const isCompleted = (deckSelections[step.id] || []).length >= step.minSelection;
                  const isCurrent = currentDeckStepIdx === idx;

                  return (
                    <button
                      key={step.id || idx}
                      type="button"
                      onClick={() => setCurrentDeckStepIdx(idx)}
                      className={`flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap px-2 py-1 rounded-xl ${
                        isCurrent
                          ? 'bg-brand-orange text-brand-charcoal shadow-xs'
                          : isCompleted
                          ? 'text-brand-green hover:bg-brand-green/10'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border ${
                        isCurrent
                          ? 'bg-brand-charcoal text-brand-orange border-brand-charcoal'
                          : isCompleted
                          ? 'bg-brand-green text-white border-brand-green'
                          : 'bg-gray-200 text-gray-500 border-gray-300'
                      }`}>
                        {isCompleted ? '✓' : idx + 1}
                      </span>
                      <span className="hidden sm:inline">Course {idx + 1}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Step Selection Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {activeDeckDeal.steps?.[currentDeckStepIdx] && (() => {
                  const currentStep = activeDeckDeal.steps[currentDeckStepIdx];
                  const selectedForThisStep = deckSelections[currentStep.id] || [];
                  const eligibleMeals = meals.filter((m) => currentStep.eligibleMealIds?.includes(m.id));

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm sm:text-base font-black text-brand-charcoal">
                            {currentStep.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {currentStep.description || `Select ${currentStep.minSelection} option(s)`}
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-brand-green/15 text-brand-green font-mono font-bold text-xs">
                          {selectedForThisStep.length} / {currentStep.maxSelection} Selected
                        </span>
                      </div>

                      {/* Selectable Meals Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {eligibleMeals.map((meal) => {
                          const isSelected = selectedForThisStep.some((m) => m.id === meal.id);
                          return (
                            <div
                              key={meal.id}
                              onClick={() => handleToggleMealInDeckStep(currentStep, meal)}
                              className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? 'bg-brand-orange/10 border-brand-orange shadow-md shadow-brand-orange/10 scale-[1.01]'
                                  : 'bg-white border-gray-200 hover:border-brand-green/40'
                              }`}
                            >
                              <div className="flex items-center gap-3 truncate pr-2">
                                <img
                                  src={meal.image}
                                  alt={meal.name}
                                  className="w-12 h-12 rounded-xl object-cover shrink-0 border"
                                />
                                <div className="truncate">
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${meal.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    <h5 className="text-xs font-bold text-brand-charcoal truncate">{meal.name}</h5>
                                  </div>
                                  <span className="text-[10px] text-gray-500 block">
                                    {meal.calories} kcal • {meal.protein}g protein
                                  </span>
                                </div>
                              </div>

                              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-brand-orange text-brand-charcoal border-brand-orange shadow-xs'
                                  : 'border-gray-300'
                              }`}>
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Live Platter Visual Tray Preview */}
                      <div className="mt-6 pt-5 border-t border-brand-green/15 bg-brand-cream/50 rounded-2xl p-4 space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-brand-charcoal block">
                          🍱 Live Royal Deck Box Preview:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(activeDeckDeal.steps || []).map((s, idx) => {
                            const chosen = deckSelections[s.id] || [];
                            return (
                              <div
                                key={s.id || idx}
                                className={`p-2.5 rounded-xl border text-center text-xs space-y-1 ${
                                  chosen.length > 0
                                    ? 'bg-white border-brand-green/30 text-brand-charcoal shadow-xs'
                                    : 'bg-gray-100/70 border-dashed border-gray-300 text-gray-400'
                                }`}
                              >
                                <span className="text-[9px] font-bold text-gray-500 block">Course {idx + 1}</span>
                                {chosen.length > 0 ? (
                                  <span className="font-bold text-[11px] text-brand-charcoal line-clamp-1">
                                    {chosen.map((m) => m.name).join(', ')}
                                  </span>
                                ) : (
                                  <span className="text-[10px] italic">Not selected</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer Step Navigation */}
              <div className="p-5 border-t border-brand-green/10 bg-brand-cream/80 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  disabled={currentDeckStepIdx === 0}
                  onClick={() => setCurrentDeckStepIdx(Math.max(0, currentDeckStepIdx - 1))}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-brand-charcoal font-bold text-xs hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                >
                  ← Back
                </button>

                <div className="flex items-center gap-3">
                  {currentDeckStepIdx < (activeDeckDeal.steps?.length || 1) - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentDeckStepIdx(currentDeckStepIdx + 1)}
                      className="px-5 py-2.5 rounded-xl bg-brand-orange text-brand-charcoal font-black text-xs uppercase tracking-wider hover:brightness-110 flex items-center gap-1 cursor-pointer shadow-md"
                    >
                      <span>Next Course</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      id="btn-complete-deck-add-cart"
                      onClick={handleAddCustomDeckToCart}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-orange to-amber-500 text-brand-charcoal font-black text-xs uppercase tracking-wider hover:brightness-110 flex items-center gap-2 cursor-pointer shadow-lg shadow-brand-orange/25"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Add Complete Deck (₹{activeDeckDeal.packagePrice})</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INTERACTIVE BOGO MODAL */}
      <AnimatePresence>
        {activeBogoDeal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden border border-brand-green/20"
            >
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-brand-green/10 bg-amber-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-brand-charcoal flex items-center justify-center shadow-md">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-brand-charcoal uppercase tracking-tight">
                      {activeBogoDeal.title}
                    </h3>
                    <p className="text-xs text-amber-900">
                      Pick 1 Primary Dish + Unlock 1 Complimentary Gift Dish
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveBogoDeal(null)}
                  className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* BOGO Selection Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* 1. Primary Dish */}
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase text-brand-orange block">
                    1. Select Your Primary Platter
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {meals
                      .filter((m) => activeBogoDeal.bogoPrimaryMealIds?.includes(m.id))
                      .map((meal) => {
                        const isSelected = selectedBogoPrimary?.id === meal.id;
                        return (
                          <div
                            key={meal.id}
                            onClick={() => setSelectedBogoPrimary(meal)}
                            className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-brand-orange/15 border-brand-orange shadow-sm'
                                : 'bg-white border-gray-200 hover:border-brand-green/30'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <h5 className="text-xs font-bold text-brand-charcoal truncate">{meal.name}</h5>
                              <span className="text-[10px] text-gray-500 font-mono">₹{meal.price}</span>
                            </div>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 shrink-0 ${
                              isSelected ? 'bg-brand-orange text-brand-charcoal border-brand-orange' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* 2. Complimentary Reward Dish */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase text-brand-green block">
                      2. Choose Your Complimentary Dish (FREE)
                    </label>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                      100% OFF ($0)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {meals
                      .filter((m) => activeBogoDeal.bogoRewardMealIds?.includes(m.id))
                      .map((meal) => {
                        const isSelected = selectedBogoReward?.id === meal.id;
                        return (
                          <div
                            key={meal.id}
                            onClick={() => setSelectedBogoReward(meal)}
                            className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-brand-green/15 border-brand-green shadow-sm'
                                : 'bg-white border-gray-200 hover:border-brand-green/30'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <h5 className="text-xs font-bold text-brand-charcoal truncate">{meal.name}</h5>
                              <span className="text-[10px] text-emerald-600 font-bold">Complimentary Gift</span>
                            </div>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 shrink-0 ${
                              isSelected ? 'bg-brand-green text-brand-charcoal border-brand-green' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* BOGO Footer */}
              <div className="p-5 border-t border-brand-green/10 bg-amber-50 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-xs text-gray-500 block">Total Offer Price</span>
                  <span className="text-lg font-black text-brand-charcoal font-mono">₹{activeBogoDeal.packagePrice}</span>
                </div>

                <button
                  type="button"
                  disabled={!selectedBogoPrimary || !selectedBogoReward}
                  onClick={handleAddBogoToCart}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-orange to-amber-500 text-brand-charcoal font-black text-xs uppercase tracking-wider hover:brightness-110 disabled:opacity-40 cursor-pointer shadow-md"
                >
                  Add BOGO Combo to Cart ➜
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
