import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Utensils, 
  Tag, 
  ShoppingBag, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Ticket, 
  Bike,
  Check,
  Compass
} from 'lucide-react';
import { TabType } from './BottomNav';

export interface FirstTimeAppTourProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: TabType) => void;
  onOpenCart: () => void;
  onCloseCart: () => void;
  isCartOpen: boolean;
  cartCount: number;
  onEnsureCartDemoItem: () => void;
}

interface TourStep {
  id: string;
  stepNumber: number;
  totalSteps: number;
  targetSelector: string;
  badge: string;
  title: string;
  shortDesc: string;
  actionButtonLabel: string;
  icon: React.ReactNode;
  accentGradient: string;
  onActivateLiveView: () => void;
}

export default function FirstTimeAppTour({
  isOpen,
  onClose,
  onSelectTab,
  onOpenCart,
  onCloseCart,
  isCartOpen,
  cartCount,
  onEnsureCartDemoItem,
}: FirstTimeAppTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Define the tour steps
  const steps: TourStep[] = [
    {
      id: 'menu',
      stepNumber: 1,
      totalSteps: 5,
      targetSelector: '#bottom-nav-menu',
      badge: 'Step 1 of 5 • Handcrafted Menu',
      title: 'Explore Handcrafted Delicacies',
      shortDesc: 'Tap here to browse authentic clay handi gravies, charcoal kebabs, and portion customizers.',
      actionButtonLabel: 'Take Me to Menu ➔',
      icon: <Utensils className="w-5 h-5 text-amber-400" />,
      accentGradient: 'from-amber-500 to-orange-600',
      onActivateLiveView: () => {
        if (isCartOpen) onCloseCart();
        onSelectTab('menu');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    },
    {
      id: 'deals',
      stepNumber: 2,
      totalSteps: 5,
      targetSelector: '#bottom-nav-deals',
      badge: 'Step 2 of 5 • Daily Bumper Deals',
      title: 'Daily Offers & Free Delicacies',
      shortDesc: 'Check here every morning for up to 20% OFF platters, combo bundles, and complimentary garlic butter naans.',
      actionButtonLabel: 'Take Me to Deals ➔',
      icon: <Tag className="w-5 h-5 text-emerald-400" />,
      accentGradient: 'from-emerald-500 to-teal-700',
      onActivateLiveView: () => {
        if (isCartOpen) onCloseCart();
        onSelectTab('deals');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    },
    {
      id: 'cart',
      stepNumber: 3,
      totalSteps: 5,
      targetSelector: '#header-cart-btn',
      badge: 'Step 3 of 5 • Your Active Cart',
      title: 'Live Order Basket & Savings',
      shortDesc: 'All dishes you pick land right here in your Cart. Tap this bag icon anytime to review items and check total discounts.',
      actionButtonLabel: 'Open Cart Live ➔',
      icon: <ShoppingBag className="w-5 h-5 text-brand-orange" />,
      accentGradient: 'from-brand-orange to-red-500',
      onActivateLiveView: () => {
        onEnsureCartDemoItem();
        onOpenCart();
      },
    },
    {
      id: 'coupons',
      stepNumber: 4,
      totalSteps: 5,
      targetSelector: '#cart-coupons-section',
      badge: 'Step 4 of 5 • Instant Discounts',
      title: '1-Tap Coupon Stacking',
      shortDesc: 'Inside your cart, tap unlocked discount chips or enter coupon codes like FIRST50 to slash your bill instantly before checkout!',
      actionButtonLabel: 'Next: How to Order ➔',
      icon: <Ticket className="w-5 h-5 text-purple-400" />,
      accentGradient: 'from-purple-500 to-indigo-600',
      onActivateLiveView: () => {
        onEnsureCartDemoItem();
        if (!isCartOpen) onOpenCart();
      },
    },
    {
      id: 'checkout',
      stepNumber: 5,
      totalSteps: 5,
      targetSelector: '#cart-checkout-btn',
      badge: 'Step 5 of 5 • Checkout & Tracking',
      title: '1-Tap Order & Live Radar',
      shortDesc: 'Choose Delivery or Takeaway, pay in 1 tap via UPI or Cash on Delivery, and watch our real-time oven-to-doorstep radar!',
      actionButtonLabel: 'Start Feasting! 🍽️',
      icon: <Bike className="w-5 h-5 text-emerald-400" />,
      accentGradient: 'from-emerald-500 to-teal-600',
      onActivateLiveView: () => {
        onEnsureCartDemoItem();
        if (!isCartOpen) onOpenCart();
      },
    },
  ];

  const currentStep = steps[currentStepIndex] || steps[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Measure and track target DOM element position
  const updateTargetRect = useCallback(() => {
    if (!isOpen) return;
    const selector = currentStep.targetSelector;
    const el = document.querySelector(selector) as HTMLElement | null;
    
    if (el) {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } catch (e) {}

      const r = el.getBoundingClientRect();
      setTargetRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  // Repeatedly check for target element position on step change (handles drawer animations)
  useEffect(() => {
    if (!isOpen) return;

    // Immediately trigger step's live state in the app
    currentStep.onActivateLiveView();

    updateTargetRect();
    const t1 = setTimeout(updateTargetRect, 80);
    const t2 = setTimeout(updateTargetRect, 220);
    const t3 = setTimeout(updateTargetRect, 450);

    const handleResizeOrScroll = () => updateTargetRect();
    window.addEventListener('resize', handleResizeOrScroll, { passive: true });
    window.addEventListener('scroll', handleResizeOrScroll, { passive: true });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll);
    };
  }, [isOpen, currentStepIndex]);

  // Reset to first step on new open
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
    }
  };

  if (!isOpen) return null;

  // Determine card placement based on target element position
  const isNearBottom = targetRect ? targetRect.top > window.innerHeight / 2 : false;
  const isNearTop = targetRect ? targetRect.bottom < window.innerHeight / 2 : false;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] select-none font-sans pointer-events-auto">
        
        {/* UNMISSABLE FLOATING SKIP PILL AT TOP RIGHT */}
        <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[130]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Skip Tour"
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-2xl shadow-red-600/50 border-2 border-white flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 animate-pulse"
          >
            <X className="w-4 h-4 stroke-[3]" />
            <span>SKIP TOUR</span>
          </button>
        </div>

        {/* SVG SPOTLIGHT CUTOUT BACKDROP */}
        {targetRect ? (
          <svg className="fixed inset-0 w-full h-full pointer-events-none z-[121]">
            <defs>
              <mask id="spotlight-hole-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={Math.max(4, targetRect.left - 8)}
                  y={Math.max(4, targetRect.top - 8)}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx="18"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(5, 7, 10, 0.78)"
              mask="url(#spotlight-hole-mask)"
            />
          </svg>
        ) : (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs pointer-events-none z-[121]" />
        )}

        {/* GLOWING SPOTLIGHT BEACON RING OVER TARGET ELEMENT */}
        {targetRect && (
          <motion.div
            key={currentStep.id}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed pointer-events-none z-[122] rounded-2xl border-2 sm:border-3 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.9),inset_0_0_15px_rgba(251,191,36,0.5)]"
            style={{
              top: Math.max(4, targetRect.top - 8),
              left: Math.max(4, targetRect.left - 8),
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          >
            {/* Outward Radiating Ping Pulse */}
            <span className="absolute -inset-1.5 rounded-2xl border-2 border-amber-400/80 animate-ping pointer-events-none" />
            
            {/* Attention Beacon Label */}
            <div className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none ${
              isNearBottom ? '-top-8' : '-bottom-8'
            }`}>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] tracking-wider uppercase shadow-md flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-stone-950" />
                <span>LOOK HERE</span>
              </span>
            </div>
          </motion.div>
        )}

        {/* INSTRUCTION CARD (SMARTLY POSITIONED NEAR ELEMENT) */}
        <div 
          className={`fixed left-4 right-4 max-w-md mx-auto z-[125] ${
            isNearBottom 
              ? 'bottom-24 sm:bottom-28' 
              : isNearTop 
              ? 'top-20 sm:top-24' 
              : 'top-1/2 -translate-y-1/2'
          }`}
        >
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: isNearBottom ? 20 : -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full bg-gradient-to-b from-[#1b1f24] to-[#0e1115] border-2 border-amber-400/80 rounded-3xl p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-white overflow-hidden relative"
          >
            {/* Ambient Background Accent Glow */}
            <div className={`absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br ${currentStep.accentGradient} opacity-20 rounded-full blur-2xl pointer-events-none`} />

            {/* Header: Step Counter & Quick Skip */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-[11px] font-black uppercase tracking-wider text-amber-300">
                <Compass className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span>{currentStep.badge}</span>
              </span>

              {/* Prominent Header Skip Button */}
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-xl bg-white/10 hover:bg-red-500/20 text-stone-300 hover:text-white border border-white/20 hover:border-red-400/50 text-[11px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
              >
                <X className="w-3 h-3 text-red-400" />
                <span>Skip</span>
              </button>
            </div>

            {/* Icon + Title */}
            <div className="flex items-center gap-3 mb-2.5">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${currentStep.accentGradient} flex items-center justify-center shadow-md shrink-0`}>
                {currentStep.icon}
              </div>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                {currentStep.title}
              </h3>
            </div>

            {/* Super Brief Description */}
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed mb-4">
              {currentStep.shortDesc}
            </p>

            {/* Progress Dots */}
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {steps.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  aria-label={`Jump to step ${idx + 1}`}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? 'w-7 bg-amber-400 shadow-md shadow-amber-400/50'
                      : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            {/* Control Row: BIG SKIP BUTTON + Back + Next Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3 border-t border-white/10">
              
              {/* BIG HIGH-CONTRAST UNMISSABLE SKIP BUTTON */}
              <button
                type="button"
                onClick={onClose}
                className="order-2 sm:order-1 px-4 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 active:bg-stone-900 border-2 border-stone-600 hover:border-stone-400 text-stone-200 hover:text-white text-xs sm:text-sm font-black tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <X className="w-4 h-4 text-rose-400" />
                <span>✕ SKIP TOUR</span>
              </button>

              <div className="order-1 sm:order-2 flex-1 flex items-center gap-2">
                {!isFirstStep && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-3.5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className={`flex-1 px-5 py-3 rounded-2xl font-black text-xs sm:text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
                    isLastStep
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/30'
                      : 'bg-gradient-to-r from-amber-500 to-brand-orange hover:from-amber-400 hover:to-brand-orange text-stone-950 font-black shadow-amber-500/30'
                  }`}
                >
                  <span>{currentStep.actionButtonLabel}</span>
                  {isLastStep ? <Check className="w-4 h-4 stroke-[3]" /> : <ArrowRight className="w-4 h-4 stroke-[3]" />}
                </button>
              </div>

            </div>

          </motion.div>
        </div>

      </div>
    </AnimatePresence>
  );
}
