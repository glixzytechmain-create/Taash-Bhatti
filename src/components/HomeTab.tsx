/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  ArrowRight,
  Star,
  Shield,
  Clock,
  Award,
  CheckCircle,
  Flame,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Utensils,
  ChefHat,
  ThumbsUp,
  Heart,
  Plus,
  ShoppingBag,
  Sparkle,
  MessageSquareQuote,
  TrendingUp,
  FlameKindling,
  Wheat,
  Smile,
  BadgeCheck,
  ExternalLink,
  Layers,
  Thermometer,
  Sliders,
  Check,
  Percent,
  Timer
} from 'lucide-react';
import { Meal, User, HeroBanner } from '../types';
import { MEALS_DATA, DEFAULT_HERO_BANNERS } from '../data';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface HomeTabProps {
  onSelectGoal?: (goal: any) => void;
  onSelectTab: (tab: any) => void;
  onAddToCart: (meal: Meal) => void;
  onQuickView: (meal: Meal) => void;
  selectedGym?: any;
  user?: User;
  fbUser?: any;
  onRelaunchOnboarding?: () => void;
  meals?: Meal[];
}

// Sparkle/Ember interface for Bhatti Sparks
interface EmberParticle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
}

export default function HomeTab({
  onSelectTab,
  onAddToCart,
  onQuickView,
  fbUser,
  meals = MEALS_DATA,
}: HomeTabProps) {
  // 1. Craving Filter State
  const [activeCraving, setActiveCraving] = useState<string>('all');

  // 2. Bhatti Sparks Particle Generator state
  const [embers, setEmbers] = useState<EmberParticle[]>([]);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<any>(null);

  // 3. Dynamic Banners State & 4-second Carousel Logic
  const [banners, setBanners] = useState<HeroBanner[]>(DEFAULT_HERO_BANNERS);
  const [currentBannerIndex, setCurrentBannerIndex] = useState<number>(0);
  const [isBannerPaused, setIsBannerPaused] = useState<boolean>(false);

  // 4. Interactive Tandoor Oven Fire Simulator State
  const [tandoorTemp, setTandoorTemp] = useState<number>(380); // 280, 380, 480

  // 5. Interactive Combo Builder State
  const [comboMain, setComboMain] = useState<Meal>(meals[0] || MEALS_DATA[0]);
  const [comboBread, setComboBread] = useState<{ id: string; name: string; price: number }>({
    id: 'br1',
    name: 'Butter Garlic Tandoori Naan',
    price: 65,
  });
  const [comboDip, setComboDip] = useState<{ id: string; name: string; price: number }>({
    id: 'dp1',
    name: 'Smoked Mint & Burani Raita',
    price: 45,
  });

  // 6. Interactive Spice Radar State
  const [selectedSpice, setSelectedSpice] = useState<'mild' | 'medium' | 'spicy'>('medium');

  // References for horizontal scrolling carousels
  const bestsellersRef = useRef<HTMLDivElement>(null);
  const spicesRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);

  // Real-time Firestore Listener for Banners
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'hero_banners'),
      (snapshot) => {
        const loadedBanners: HeroBanner[] = [];
        snapshot.forEach((docSnap) => {
          loadedBanners.push({
            id: docSnap.id,
            ...docSnap.data(),
          } as HeroBanner);
        });

        if (loadedBanners.length > 0) {
          loadedBanners.sort((a, b) => (a.order || 0) - (b.order || 0));
          setBanners(loadedBanners.filter((b) => b.isActive !== false));
        } else {
          setBanners(DEFAULT_HERO_BANNERS);
        }
      },
      (error) => {
        console.warn('Hero banners Firestore listener error, using defaults:', error);
        setBanners(DEFAULT_HERO_BANNERS);
      }
    );
    return () => unsub();
  }, []);

  // Auto-transition Banners every 4 Seconds
  useEffect(() => {
    if (banners.length <= 1 || isBannerPaused) return;

    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [banners.length, isBannerPaused]);

  // Handle Banner Click Routing
  const handleBannerClick = (banner: HeroBanner) => {
    if (!banner.linkUrl) return;
    const target = banner.linkUrl.trim();
    if (target.startsWith('http://') || target.startsWith('https://')) {
      window.open(target, '_blank');
    } else {
      onSelectTab(target as any);
    }
  };

  // Generate embers on mount & scroll
  useEffect(() => {
    const initialEmbers: EmberParticle[] = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      x: Math.random() * 95, // % from left
      size: Math.random() * 4 + 3, // 3px to 7px
      duration: Math.random() * 3 + 2.5, // 2.5s to 5.5s
      delay: Math.random() * 2,
    }));
    setEmbers(initialEmbers);

    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 800);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Filtered meals based on Craving selection
  const filteredMeals = meals.filter((m) => {
    if (m.isHidden) return false;
    if (activeCraving === 'tandoori') return m.name.toLowerCase().includes('tikka') || m.name.toLowerCase().includes('bhatti') || m.name.toLowerCase().includes('tandoori');
    if (activeCraving === 'veg') return m.isVeg;
    if (activeCraving === 'protein') return !m.isVeg || m.name.toLowerCase().includes('paneer');
    if (activeCraving === 'spicy') return m.spicyLevel === 'spicy';
    return true;
  });

  const featuredMeals = filteredMeals
    .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.popularity || 0) - (a.popularity || 0))
    .slice(0, 6);

  // Scroll helper
  const scrollCarousel = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Secret Spices Data
  const SPICES_DATA = [
    {
      id: 'sp1',
      title: 'Hand-Pounded Kashmiri Chili & Mustard',
      subtitle: 'Sun-dried red peppers roasted over charcoal for deep crimson color without harsh heat.',
      dish: 'Bhatti Paneer Tikka & Chicken Malai',
      image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=80',
      aroma: 'Smoky • Fruity Heat',
    },
    {
      id: 'sp2',
      title: 'Royal Shahi Saffron & Kewra Water',
      subtitle: 'Pure Kashmiri saffron threads bloomed in warm milk and sprayed during handi dum seal.',
      dish: 'Dum Biryani & Matka Phirni',
      image: 'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=600&auto=format&fit=crop&q=80',
      aroma: 'Floral • Regal Sweetness',
    },
    {
      id: 'sp3',
      title: 'Black Cardamom & Mace Blend',
      subtitle: 'Crushed freshly every morning in small stone batches for authentic Awadhi fragrance.',
      dish: 'Clay-Oven Dal Makhani & Kebabs',
      image: 'https://images.unsplash.com/photo-1509358217951-683a3d54ef02?w=600&auto=format&fit=crop&q=80',
      aroma: 'Earthy • Warm Spice',
    },
    {
      id: 'sp4',
      title: 'Desi Ghee & Charcoal Smoke (Dhungar)',
      subtitle: 'Hot hardwood charcoal bathed in cow ghee to infuse pure tandoori woodfire notes.',
      dish: 'All Clay Oven Specialties',
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
      aroma: 'Woodfire • Velvety Butter',
    },
  ];

  // Customer Food Stories
  const FOOD_REVIEWS = [
    {
      id: 'rev1',
      name: 'Aniket Kapoor',
      tag: 'Verified Foodie',
      comment: 'The Dal Makhani with Garlic Naan literally tastes like it came out of an authentic Punjabi dhaba clay oven! Piping hot delivery.',
      dish: 'Dal Makhani + Garlic Naan',
      rating: 5,
      avatar: 'AK',
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'rev2',
      name: 'Dr. Meera Sharma',
      tag: 'Regular Patron',
      comment: 'Ordered the Paneer Tikka for a house dinner. Smoked to perfection, super soft cottage cheese, and zero grease. Highly recommended!',
      dish: 'Bhatti Paneer Tikka',
      rating: 5,
      avatar: 'MS',
      image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'rev3',
      name: 'Rahul Sinha',
      tag: 'Party Host',
      comment: 'Used the new Catering planner for 30 guests at my office lunch. Portions were super generous and everybody loved the Handi Biryani!',
      dish: 'Handi Chicken Biryani Box',
      rating: 5,
      avatar: 'RS',
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    },
  ];

  // Calculated Combo Price
  const rawComboTotal = comboMain.price + comboBread.price + comboDip.price;
  const comboDiscountedTotal = Math.round(rawComboTotal * 0.9); // 10% Bundle Discount

  const activeBanner = banners[currentBannerIndex] || DEFAULT_HERO_BANNERS[0];

  const handleAddComboToCart = () => {
    // Create a custom combo meal object to add to cart
    const comboMeal: Meal = {
      id: `combo_${Date.now()}`,
      name: `Clay Oven Box: ${comboMain.name} + ${comboBread.name}`,
      description: `Custom 3-piece Box with ${comboMain.name}, ${comboBread.name}, and ${comboDip.name}. Includes 10% Combo Bundle Discount!`,
      price: comboDiscountedTotal,
      image: comboMain.image,
      isVeg: comboMain.isVeg,
      spicyLevel: comboMain.spicyLevel,
      rating: comboMain.rating,
      popularity: 99,
      prepTimeMinutes: 25,
      timings: ['lunch', 'dinner'],
      ingredients: comboMain.ingredients || [],
    };
    onAddToCart(comboMeal);
  };

  return (
    <div className="pb-28 relative overflow-hidden select-none">
      
      {/* ========================================== */}
      {/* BHATTI SPARKS OVERLAY (FLOATING EMBERS) */}
      {/* ========================================== */}
      <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
        {embers.map((p) => (
          <motion.div
            key={p.id}
            initial={{ y: '105vh', opacity: 0, scale: 0.2 }}
            animate={{
              y: '-10vh',
              opacity: [0, 0.8, 1, 0.6, 0],
              x: [`${p.x}%`, `${p.x + (p.id % 2 === 0 ? 4 : -4)}%`, `${p.x}%`],
              scale: [0.2, 1, 0.8, 0],
            }}
            transition={{
              duration: isScrolling ? p.duration * 0.6 : p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeOut',
            }}
            className="absolute rounded-full bg-gradient-to-t from-amber-400 to-amber-200 shadow-[0_0_12px_#ff6600,0_0_24px_#ffaa00]"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              left: `${p.x}%`,
            }}
          />
        ))}
      </div>

      {/* ========================================== */}
      {/* 1. HERO SECTION WITH DYNAMIC BANNER CAROUSEL */}
      {/* ========================================== */}
      <section className="relative px-4 pt-6 pb-8 bg-gradient-to-b from-brand-orange/15 via-brand-cream/30 to-transparent">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row lg:items-center justify-between gap-6"
          >
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-orange/15 text-brand-orange border border-brand-orange/30 text-xs font-black tracking-wider uppercase shadow-2xs animate-pulse">
                <Flame className="w-4 h-4 text-brand-orange fill-brand-orange" />
                <span>Original Clay-Oven Gourmet Kitchen</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-brand-charcoal tracking-tight leading-tight">
                Authentic Tandoori.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange via-amber-500 to-brand-green">
                  Fresh, Smoked & Delivered Hot.
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-brand-charcoal/70 leading-relaxed font-medium">
                Hand-pounded spices, 24-hour slow-cooked Dal Makhani, and charcoal-seared tikkas packed in insulated thermal boxes straight to your doorstep.
              </p>
            </div>

            {/* DYNAMIC HERO BANNER & EVENTS SHOWCASE CAROUSEL (4-SEC AUTO TRANSITION) */}
            <div
              onMouseEnter={() => setIsBannerPaused(true)}
              onMouseLeave={() => setIsBannerPaused(false)}
              className="relative w-full lg:w-[420px] h-[280px] rounded-3xl overflow-hidden shadow-2xl border border-brand-orange/30 group bg-brand-charcoal text-white shrink-0"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeBanner.id}
                  initial={{ opacity: 0, x: 50, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -50, scale: 0.98 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  onClick={() => handleBannerClick(activeBanner)}
                  className="absolute inset-0 cursor-pointer p-5 flex flex-col justify-between"
                >
                  {/* Background Image Overlay */}
                  {activeBanner.image && (
                    <div className="absolute inset-0 z-0">
                      <img
                        src={activeBanner.image}
                        alt={activeBanner.title}
                        className="w-full h-full object-cover opacity-35 group-hover:scale-105 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal via-brand-charcoal/80 to-transparent" />
                    </div>
                  )}

                  {/* Header Badge & Transition Timer Indicator */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="bg-brand-orange text-white font-black text-[10px] uppercase px-3 py-1 rounded-full shadow-md tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      {activeBanner.badge || 'PROMOTION'}
                    </span>

                    <span className="text-[9px] font-mono text-gray-300 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 flex items-center gap-1">
                      <Timer className="w-3 h-3 text-brand-orange" />
                      {currentBannerIndex + 1}/{banners.length}
                    </span>
                  </div>

                  {/* Banner Content Body */}
                  <div className="relative z-10 space-y-1.5 my-auto pt-4">
                    <h3 className="text-lg sm:text-xl font-black text-amber-300 leading-tight drop-shadow-md">
                      {activeBanner.title}
                    </h3>
                    <p className="text-xs text-gray-200 line-clamp-2 leading-relaxed font-medium">
                      {activeBanner.subtitle}
                    </p>
                  </div>

                  {/* Footer CTA & Direct Redirection */}
                  <div className="relative z-10 pt-3 border-t border-white/15 flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBannerClick(activeBanner);
                      }}
                      className="px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5 group-hover:scale-105"
                    >
                      <span>{activeBanner.buttonText || 'Explore Now ➜'}</span>
                      {activeBanner.linkUrl?.startsWith('http') && <ExternalLink className="w-3 h-3" />}
                    </button>

                    {/* Manual Navigation Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
                        }}
                        className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
                        }}
                        className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Progress Dots Indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 pointer-events-none">
                {banners.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentBannerIndex ? 'w-5 bg-brand-orange' : 'w-1.5 bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>

          </motion.div>

          {/* Guest Account Sign-in Banner */}
          {!fbUser && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-4 rounded-2xl bg-white border border-brand-green/15 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                  <BadgeCheck className="w-5 h-5 text-brand-green" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-brand-charcoal">Sign In for Member Perks & Live Tracking</h4>
                  <p className="text-[10px] text-brand-charcoal/60">Save delivery addresses, earn reward points, and track your food live.</p>
                </div>
              </div>

              <button
                onClick={() => onSelectTab('account')}
                className="w-full sm:w-auto px-4 py-2 bg-brand-green hover:bg-brand-green/90 text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1 shrink-0"
              >
                Sign In / Register <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {/* 🃏 MY DECK QUICK LAUNCHER RIBBON */}
          <div
            onClick={() => {
              onSelectTab('deck');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="p-4 rounded-2xl bg-gradient-to-r from-brand-charcoal via-zinc-900 to-brand-green/90 text-white border border-amber-400/40 shadow-md flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center justify-center text-xl font-black shrink-0 group-hover:scale-110 transition-transform">
                🃏
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    MY DECK
                  </h4>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-brand-orange text-brand-charcoal">
                    Royal Favorites Hand
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 mt-0.5">
                  3D flipping playing cards, chef secret specs & 1-tap reordering
                </p>
              </div>
            </div>

            <div className="text-xs font-black text-amber-300 flex items-center gap-1 shrink-0 bg-white/10 px-3 py-1.5 rounded-xl group-hover:bg-white/20 transition-colors">
              <span className="hidden sm:inline">Open Hand</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

        </div>
      </section>

      {/* ========================================== */}
      {/* 2. CRAVING / MOOD FILTER BAR */}
      {/* ========================================== */}
      <section className="max-w-6xl mx-auto px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {[
            { id: 'all', label: '✨ All Specialties', icon: Sparkles },
            { id: 'tandoori', label: '🔥 Smoked Tandoori', icon: Flame },
            { id: 'veg', label: '🍃 Pure Vegetarian', icon: CheckCircle },
            { id: 'protein', label: '💪 High Protein', icon: TrendingUp },
            { id: 'spicy', label: '🌶️ Spicy Awadhi', icon: FlameKindling },
          ].map((c) => {
            const IconComponent = c.icon;
            const isSelected = activeCraving === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCraving(c.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-black tracking-wide shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-brand-charcoal text-white shadow-md scale-105 border border-brand-orange/40'
                    : 'bg-white text-brand-charcoal/70 border border-brand-green/10 hover:bg-brand-cream/50'
                }`}
              >
                <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-brand-orange' : 'text-brand-green'}`} />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ========================================== */}
      {/* 3. HORIZONTAL SCROLL CAROUSEL 1: BESTSELLERS */}
      {/* ========================================== */}
      <section className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-brand-orange tracking-wider">
              <Sparkle className="w-3 h-3 text-brand-orange" /> Handpicked Classics
            </div>
            <h2 className="text-xl font-black text-brand-charcoal">
              Chef's Clay-Oven Bestsellers
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollCarousel(bestsellersRef, 'left')}
              className="w-9 h-9 rounded-xl bg-white border border-brand-green/15 text-brand-charcoal hover:bg-brand-cream font-black flex items-center justify-center transition-all shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollCarousel(bestsellersRef, 'right')}
              className="w-9 h-9 rounded-xl bg-white border border-brand-green/15 text-brand-charcoal hover:bg-brand-cream font-black flex items-center justify-center transition-all shadow-2xs cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Scroll Track */}
        <div
          ref={bestsellersRef}
          className="flex gap-4 overflow-x-auto snap-x scrollbar-none pb-4 pt-1 px-1 scroll-smooth"
        >
          {featuredMeals.map((meal, mealIdx) => (
            <motion.div
              key={`feat-meal-${meal.id || mealIdx}-${mealIdx}`}
              whileHover={{ y: -5 }}
              className="w-72 sm:w-80 bg-white rounded-3xl border border-brand-green/15 p-4 shadow-sm hover:shadow-xl transition-all shrink-0 snap-start flex flex-col justify-between space-y-3 relative group"
            >
              <div className="relative rounded-2xl overflow-hidden h-44 border border-brand-green/10">
                <img
                  src={meal.image}
                  alt={meal.name}
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${meal.isAvailable === false ? 'grayscale contrast-75 opacity-70' : ''}`}
                  referrerPolicy="no-referrer"
                />

                {meal.rating && meal.rating > 0 && meal.reviewsCount && meal.reviewsCount > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickView(meal);
                    }}
                    title={`Rated ${meal.rating.toFixed(1)}/5 from ${meal.reviewsCount} diner reviews. Click to read reviews.`}
                    className="absolute top-3 left-3 bg-brand-charcoal/90 hover:bg-brand-charcoal text-white font-black text-[10px] px-2.5 py-1 rounded-full uppercase flex items-center gap-1 shadow-md border border-white/10 cursor-pointer transition-colors"
                  >
                    <Star className="w-3 h-3 text-brand-orange fill-brand-orange" />
                    <span>{meal.rating.toFixed(1)}</span>
                    <span className="text-white/60 text-[8px]">({meal.reviewsCount})</span>
                  </button>
                ) : null}

                <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${meal.isVeg ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'} shadow-md`}>
                  {meal.isVeg ? 'PURE VEG' : 'NON-VEG'}
                </div>

                <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-xs text-amber-300 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-brand-orange" /> 480°C Woodfire
                </div>

                {meal.isAvailable === false && (
                  <div className="absolute inset-0 bg-brand-charcoal/50 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center">
                    <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl border border-red-400 tracking-wider uppercase">
                      SOLD OUT
                    </span>
                    {meal.soldOutReason && (
                      <span className="mt-1 text-[9px] font-bold text-red-100 bg-red-950/80 px-2 py-0.5 rounded-md max-w-[85%] truncate">
                        {meal.soldOutReason}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-brand-charcoal leading-snug line-clamp-1">
                  {meal.name}
                </h3>
                <p className="text-[11px] text-brand-charcoal/60 mt-1 line-clamp-2 leading-relaxed">
                  {meal.description}
                </p>

                {/* Verified Diner Review preview ONLY on rated dishes */}
                {meal.rating && meal.rating > 0 && meal.reviewsCount && meal.reviewsCount > 0 ? (
                  <div className="mt-2 p-1.5 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-center justify-between gap-1 text-[10px] text-amber-950">
                    <div className="flex items-center gap-1 min-w-0">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                      <span className="font-black">{meal.rating.toFixed(1)}</span>
                      <span className="text-amber-900/80 text-[9px] truncate">({meal.reviewsCount} verified reviews)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onQuickView(meal)}
                      className="text-[9px] font-bold text-amber-900 hover:text-amber-950 underline shrink-0 cursor-pointer"
                    >
                      Reviews →
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="pt-3 border-t border-brand-green/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-brand-charcoal/40 font-bold block uppercase">PRICE</span>
                  <span className="text-base font-black text-brand-green">₹{meal.price}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onQuickView(meal)}
                    className="px-3 py-2 rounded-xl text-xs bg-brand-green/10 text-brand-green font-extrabold hover:bg-brand-green/20 transition-all cursor-pointer"
                  >
                    Details
                  </button>

                  {meal.isAvailable === false ? (
                    <button disabled className="px-3 py-2 rounded-xl text-xs bg-gray-200 text-gray-400 font-bold cursor-not-allowed">
                      Sold Out
                    </button>
                  ) : (
                    <button
                      onClick={() => onAddToCart(meal)}
                      className="px-4 py-2 rounded-xl text-xs bg-brand-green text-white font-black hover:bg-brand-green/90 transition-all shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ========================================== */}
      {/* 4. NEW INTERACTIVE SECTION: TANDOOR OVEN FIRE SIMULATOR */}
      {/* ========================================== */}
      <section className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-gradient-to-br from-[#131920] via-[#1B242E] to-[#0D1217] text-white rounded-3xl p-6 sm:p-8 border border-brand-orange/30 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-brand-orange/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                <Thermometer className="w-3.5 h-3.5 text-brand-orange" />
                Interactive Bhatti Flame Simulator
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Select Clay Oven Cooking Temperature
              </h2>
            </div>

            <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10">
              {[
                { temp: 280, label: '280°C Slow Dum', icon: Clock },
                { temp: 380, label: '380°C Smoked Grill', icon: Flame },
                { temp: 480, label: '480°C Woodfire Sear', icon: Zap },
              ].map((t) => (
                <button
                  key={t.temp}
                  onClick={() => setTandoorTemp(t.temp)}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                    tandoorTemp === t.temp
                      ? 'bg-brand-orange text-white shadow-lg scale-105'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Temperature Visual Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tandoorTemp === 280 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="space-y-3">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest block">
                    🔥 280°C - Slow Dum Handi Sealing
                  </span>
                  <h3 className="text-lg font-black text-white">24-Hour Dum Cooked Dal Makhani & Handi Biryani</h3>
                  <p className="text-xs text-gray-300 leading-relaxed font-medium">
                    At 280°C, dough-sealed clay handis retain every drop of moisture and aroma. Whole black lentils break down slowly in white butter over hickory wood coals.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => onSelectTab('menu')} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-brand-charcoal font-black text-xs rounded-xl transition-all cursor-pointer">
                      Order Slow Dum Specialties ➜
                    </button>
                  </div>
                </div>
                <div className="relative h-48 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                  <img src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80" alt="Dum Cooked" className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 bg-black/80 text-amber-400 font-mono text-[10px] px-2.5 py-1 rounded-lg font-bold border border-white/10">
                    280°C Controlled Steam
                  </div>
                </div>
              </motion.div>
            )}

            {tandoorTemp === 380 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="space-y-3">
                  <span className="text-xs font-mono font-bold text-brand-orange uppercase tracking-widest block">
                    🔥 380°C - Smoked Charcoal Kebabs
                  </span>
                  <h3 className="text-lg font-black text-white">Bhatti Paneer Tikka & Malai Chicken Kebabs</h3>
                  <p className="text-xs text-gray-300 leading-relaxed font-medium">
                    Skewers suspended directly above white-hot coals. The dripping spiced yogurt marinade hits the coals, creating aromatic dhungar smoke that locks into tender protein.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => onSelectTab('menu')} className="px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-xs rounded-xl transition-all cursor-pointer">
                      Order Charcoal Kebabs ➜
                    </button>
                  </div>
                </div>
                <div className="relative h-48 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                  <img src="https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&auto=format&fit=crop&q=80" alt="Charcoal Kebabs" className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 bg-black/80 text-brand-orange font-mono text-[10px] px-2.5 py-1 rounded-lg font-bold border border-white/10">
                    380°C Dhungar Smoke
                  </div>
                </div>
              </motion.div>
            )}

            {tandoorTemp === 480 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="space-y-3">
                  <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest block">
                    🔥 480°C - Woodfire Sear & Blistered Breads
                  </span>
                  <h3 className="text-lg font-black text-white">Crisp Butter Garlic Naans & Flame-Seared Roti</h3>
                  <p className="text-xs text-gray-300 leading-relaxed font-medium">
                    Dough slapped directly onto blistering clay walls at 480°C puffs up in under 45 seconds, developing signature charred blisters brushed immediately with white butter.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => onSelectTab('menu')} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-black text-xs rounded-xl transition-all cursor-pointer">
                      Order Fresh Naans ➜
                    </button>
                  </div>
                </div>
                <div className="relative h-48 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                  <img src="https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80" alt="Clay Oven Naan" className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 bg-black/80 text-red-400 font-mono text-[10px] px-2.5 py-1 rounded-lg font-bold border border-white/10">
                    480°C Clay Sear
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 5. NEW INTERACTIVE SECTION: QUICK COMBO BUILDER */}
      {/* ========================================== */}
      <section className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-green/15 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-brand-green/10 pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-brand-green bg-brand-green/10 px-3 py-1 rounded-full border border-brand-green/20">
                <Layers className="w-3.5 h-3.5 text-brand-green" /> Custom 3-Piece Platter
              </span>
              <h2 className="text-xl font-black text-brand-charcoal mt-1">
                Build Your Clay-Oven Meal Box
              </h2>
            </div>

            <div className="inline-flex items-center gap-2 bg-brand-orange/15 px-3 py-1.5 rounded-xl border border-brand-orange/30">
              <Percent className="w-4 h-4 text-brand-orange" />
              <span className="text-xs font-black text-brand-orange uppercase">Includes 10% Combo Bundle Discount</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1: Main Tandoori Dish */}
            <div className="space-y-3 bg-brand-cream/30 p-4 rounded-2xl border border-brand-green/10">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-charcoal/60 block">
                STEP 1: SELECT MAIN TANDOORI (1)
              </span>
              <div className="space-y-2">
                {meals.slice(0, 3).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setComboMain(m)}
                    className={`w-full p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                      comboMain.id === m.id
                        ? 'bg-brand-charcoal text-white border-brand-orange shadow-sm font-bold'
                        : 'bg-white text-brand-charcoal border-gray-200 hover:border-brand-green/30'
                    }`}
                  >
                    <span className="text-xs font-extrabold line-clamp-1">{m.name}</span>
                    <span className={`text-xs font-mono shrink-0 ml-2 ${comboMain.id === m.id ? 'text-amber-300' : 'text-brand-green font-black'}`}>
                      ₹{m.price}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Bread or Rice */}
            <div className="space-y-3 bg-brand-cream/30 p-4 rounded-2xl border border-brand-green/10">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-charcoal/60 block">
                STEP 2: SELECT BREAD / RICE (1)
              </span>
              <div className="space-y-2">
                {[
                  { id: 'br1', name: 'Butter Garlic Tandoori Naan', price: 65 },
                  { id: 'br2', name: 'Kashmiri Saffron Dum Pulao', price: 120 },
                  { id: 'br3', name: 'Clay-Oven Whole Wheat Roti (2 pcs)', price: 40 },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setComboBread(b)}
                    className={`w-full p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                      comboBread.id === b.id
                        ? 'bg-brand-charcoal text-white border-brand-orange shadow-sm font-bold'
                        : 'bg-white text-brand-charcoal border-gray-200 hover:border-brand-green/30'
                    }`}
                  >
                    <span className="text-xs font-extrabold line-clamp-1">{b.name}</span>
                    <span className={`text-xs font-mono shrink-0 ml-2 ${comboBread.id === b.id ? 'text-amber-300' : 'text-brand-green font-black'}`}>
                      ₹{b.price}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Gourmet Dip */}
            <div className="space-y-3 bg-brand-cream/30 p-4 rounded-2xl border border-brand-green/10">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-charcoal/60 block">
                STEP 3: SELECT DIP / CHUTNEY (1)
              </span>
              <div className="space-y-2">
                {[
                  { id: 'dp1', name: 'Smoked Mint & Burani Raita', price: 45 },
                  { id: 'dp2', name: 'Awadhi Spicy Tomato Chutney', price: 35 },
                  { id: 'dp3', name: 'Garlic Yogurt Dip & Onions', price: 40 },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setComboDip(d)}
                    className={`w-full p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                      comboDip.id === d.id
                        ? 'bg-brand-charcoal text-white border-brand-orange shadow-sm font-bold'
                        : 'bg-white text-brand-charcoal border-gray-200 hover:border-brand-green/30'
                    }`}
                  >
                    <span className="text-xs font-extrabold line-clamp-1">{d.name}</span>
                    <span className={`text-xs font-mono shrink-0 ml-2 ${comboDip.id === d.id ? 'text-amber-300' : 'text-brand-green font-black'}`}>
                      ₹{d.price}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Combo Box Footer */}
          <div className="pt-4 border-t border-brand-green/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-brand-cream/40 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-green text-white font-black text-xs flex items-center justify-center shrink-0">
                🍱
              </div>
              <div>
                <span className="text-[10px] text-brand-charcoal/60 font-bold uppercase block">COMBO PACKAGE VALUE</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-brand-green">₹{comboDiscountedTotal}</span>
                  <span className="text-xs text-gray-400 line-through">₹{rawComboTotal}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-md">
                    Save ₹{rawComboTotal - comboDiscountedTotal}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleAddComboToCart}
              className="w-full sm:w-auto px-6 py-3 bg-brand-green hover:bg-brand-green/90 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Custom Combo Box
            </button>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 6. CATERING & PARTY PLANNER BANNER */}
      {/* ========================================== */}
      <section className="max-w-6xl mx-auto px-4 py-4">
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="relative bg-gradient-to-r from-brand-charcoal via-[#19222B] to-brand-charcoal text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-brand-orange/30 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="absolute top-0 right-0 w-72 h-72 bg-brand-orange/15 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-2 z-10 text-center md:text-left">
            <span className="inline-flex items-center gap-1 bg-brand-orange text-white text-[10px] font-black uppercase px-3.5 py-1 rounded-full tracking-wider shadow-xs">
              <Sparkles className="w-3 h-3" /> Party & Event Catering Planner
            </span>
            <h3 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              Hosting 10 to 100+ Guests?
            </h3>
            <p className="text-xs text-gray-300 max-w-lg leading-relaxed font-medium">
              Use our dedicated <strong>Catering Planner</strong> to auto-calculate portions, build custom box combos, and get bulk tier discounts up to <strong>20% OFF</strong> + free perks!
            </p>
          </div>

          <button
            onClick={() => onSelectTab('catering')}
            className="z-10 px-6 py-4 bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 shrink-0"
          >
            Launch Catering Planner <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </section>

      {/* ========================================== */}
      {/* 7. HORIZONTAL SCROLL CAROUSEL 2: SECRET SPICES */}
      {/* ========================================== */}
      <section className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-brand-green tracking-wider">
              <ChefHat className="w-3.5 h-3.5 text-brand-green" /> The Art of Tandoor
            </div>
            <h2 className="text-xl font-black text-brand-charcoal">
              Master Chef's Secret Spices & Craft
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollCarousel(spicesRef, 'left')}
              className="w-9 h-9 rounded-xl bg-white border border-brand-green/15 text-brand-charcoal hover:bg-brand-cream font-black flex items-center justify-center transition-all shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollCarousel(spicesRef, 'right')}
              className="w-9 h-9 rounded-xl bg-white border border-brand-green/15 text-brand-charcoal hover:bg-brand-cream font-black flex items-center justify-center transition-all shadow-2xs cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Spices Horizontal Scroll Track */}
        <div
          ref={spicesRef}
          className="flex gap-4 overflow-x-auto snap-x scrollbar-none pb-4 pt-1 px-1 scroll-smooth"
        >
          {SPICES_DATA.map((sp, spIdx) => (
            <div
              key={`sp-${sp.id || spIdx}-${spIdx}`}
              className="w-80 sm:w-96 bg-gradient-to-br from-[#121A22] to-[#0D1318] text-white rounded-3xl p-5 border border-white/10 shadow-lg shrink-0 snap-start space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden h-36 border border-white/10">
                  <img src={sp.image} alt={sp.title} className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-xs text-brand-orange text-[9px] font-black px-2.5 py-1 rounded-md uppercase">
                    {sp.aroma}
                  </div>
                </div>

                <h3 className="font-black text-sm text-amber-300 leading-snug">
                  {sp.title}
                </h3>
                <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                  {sp.subtitle}
                </p>
              </div>

              <div className="pt-2 border-t border-white/10 text-[10px] text-gray-400 font-bold flex items-center justify-between">
                <span>Featured In:</span>
                <span className="text-white font-black bg-white/10 px-2.5 py-1 rounded-lg">
                  {sp.dish}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================== */}
      {/* 8. WHY TAASH BHATTI GUARANTEE GRID */}
      {/* ========================================== */}
      <section className="max-w-6xl mx-auto px-4 py-8 bg-white border border-brand-green/10 rounded-3xl my-6 shadow-sm space-y-6">
        <div className="text-center space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange">
            UNCOMPROMISING QUALITY
          </span>
          <h2 className="text-xl font-black text-brand-charcoal">
            The TAASH BHATTI Culinary Promise
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-brand-cream/30 border border-brand-green/10 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center mx-auto">
              <Shield className="w-5 h-5 text-brand-green" />
            </div>
            <h4 className="font-extrabold text-xs text-brand-charcoal">100% Farm Organic</h4>
            <p className="text-[10px] text-brand-charcoal/60 leading-relaxed">
              Fresh vegetables & milk-soaked cottage cheese prepared daily.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-brand-cream/30 border border-brand-green/10 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 text-brand-orange flex items-center justify-center mx-auto">
              <Clock className="w-5 h-5 text-brand-orange" />
            </div>
            <h4 className="font-extrabold text-xs text-brand-charcoal">Thermal Hot Box</h4>
            <p className="text-[10px] text-brand-charcoal/60 leading-relaxed">
              Insulated foil containers retain sizzle & steam during transit.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-brand-cream/30 border border-brand-green/10 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Award className="w-5 h-5 text-amber-700" />
            </div>
            <h4 className="font-extrabold text-xs text-brand-charcoal">Awadhi Clay Craft</h4>
            <p className="text-[10px] text-brand-charcoal/60 leading-relaxed">
              Traditional slow dum-cooking for 24-hr black lentils.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-brand-cream/30 border border-brand-green/10 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle className="w-5 h-5 text-emerald-800" />
            </div>
            <h4 className="font-extrabold text-xs text-brand-charcoal">Zero Reused Oil</h4>
            <p className="text-[10px] text-brand-charcoal/60 leading-relaxed">
              Strict hygiene protocols with zero synthetic dyes or preservatives.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 9. HORIZONTAL SCROLL CAROUSEL 3: FOOD STORIES & REVIEWS */}
      {/* ========================================== */}
      <section className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-brand-orange tracking-wider">
              <MessageSquareQuote className="w-3.5 h-3.5 text-brand-orange" /> Customer Love
            </div>
            <h2 className="text-xl font-black text-brand-charcoal">
              Real Foodie Stories & Reviews
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollCarousel(reviewsRef, 'left')}
              className="w-9 h-9 rounded-xl bg-white border border-brand-green/15 text-brand-charcoal hover:bg-brand-cream font-black flex items-center justify-center transition-all shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollCarousel(reviewsRef, 'right')}
              className="w-9 h-9 rounded-xl bg-white border border-brand-green/15 text-brand-charcoal hover:bg-brand-cream font-black flex items-center justify-center transition-all shadow-2xs cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reviews Horizontal Track */}
        <div
          ref={reviewsRef}
          className="flex gap-4 overflow-x-auto snap-x scrollbar-none pb-4 pt-1 px-1 scroll-smooth"
        >
          {FOOD_REVIEWS.map((rev, revIdx) => (
            <div
              key={`rev-${rev.id || revIdx}-${revIdx}`}
              className="w-80 sm:w-96 bg-white rounded-3xl border border-brand-green/15 p-5 shadow-xs hover:shadow-md transition-all shrink-0 snap-start flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={`star-${rev.id}-${i}`} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>

                  <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {rev.tag}
                  </span>
                </div>

                <p className="text-xs text-brand-charcoal/80 italic leading-relaxed">
                  "{rev.comment}"
                </p>
              </div>

              <div className="pt-3 border-t border-brand-green/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-brand-orange text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {rev.avatar}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-charcoal">{rev.name}</h4>
                    <span className="text-[9px] text-brand-charcoal/50 block">Ordered: {rev.dish}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

