import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Utensils, 
  Tag, 
  ShoppingBag, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Ticket, 
  Bike,
  Check
} from 'lucide-react';
import { TabType } from './BottomNav';

interface FirstTimeAppTourProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: TabType) => void;
  onOpenCart: () => void;
}

interface TourStep {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  highlightActionLabel?: string;
  actionTab?: TabType;
  actionCart?: boolean;
}

export default function FirstTimeAppTour({
  isOpen,
  onClose,
  onSelectTab,
  onOpenCart,
}: FirstTimeAppTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const steps: TourStep[] = [
    {
      id: 'welcome',
      badge: 'Step 1 of 5 • Welcome',
      title: 'Welcome to Taash Bhatti!',
      subtitle: 'Original Clay-Oven Gourmet Dining',
      description: 'Experience authentic woodfire handi dum feasts, charcoal-smoked kebabs, and clay tandoor naans — freshly prepared and delivered piping hot.',
      icon: <Flame className="w-8 h-8 text-brand-orange animate-pulse" />,
      accentColor: 'from-brand-orange to-amber-600',
    },
    {
      id: 'menu',
      badge: 'Step 2 of 5 • The Live Menu',
      title: 'Handcrafted Gourmet Menu',
      subtitle: 'Slow-Cooked Feasts & Custom Portions',
      description: 'Tap the Menu button anytime to browse signature Champaran handi meat, 24-hr slow-cooked dal makhani, and sizzling kebabs with custom spice levels.',
      icon: <Utensils className="w-8 h-8 text-amber-400" />,
      accentColor: 'from-amber-500 to-yellow-600',
      highlightActionLabel: 'Peek at Menu ➜',
      actionTab: 'menu',
    },
    {
      id: 'deals',
      badge: 'Step 3 of 5 • Bumper Deals',
      title: 'Daily Offers & Free Delicacies',
      subtitle: 'Up to 20% OFF & BOGO Platters',
      description: 'Check the Deals tab every morning! Unlock limited-time tandoor discounts, combo bundles, and complimentary garlic butter naans on qualifying orders.',
      icon: <Tag className="w-8 h-8 text-emerald-400" />,
      accentColor: 'from-emerald-500 to-teal-700',
      highlightActionLabel: 'View Today’s Deals ➜',
      actionTab: 'deals',
    },
    {
      id: 'cart-coupons',
      badge: 'Step 4 of 5 • Cart & Coupons',
      title: 'Instant 1-Tap Coupon Stacking',
      subtitle: 'Slash Your Bill at Checkout',
      description: 'Add dishes and open your Cart. Apply 1-tap coupon chips or enter promo codes like FIRST50 for immediate discounts before placing your order!',
      icon: <Ticket className="w-8 h-8 text-purple-400" />,
      accentColor: 'from-purple-500 to-indigo-600',
      highlightActionLabel: 'Open Cart Preview ➜',
      actionCart: true,
    },
    {
      id: 'tracking',
      badge: 'Step 5 of 5 • Live KDS Radar',
      title: 'Real-Time Kitchen & Rider Tracking',
      subtitle: 'From Clay Oven Embers to Your Doorstep',
      description: 'Place your order in 1 tap via UPI or Cash on Delivery. Watch your clay handi seal, slow-cook, and track our insulated delivery rider straight to your door!',
      icon: <Bike className="w-8 h-8 text-brand-orange" />,
      accentColor: 'from-brand-orange to-red-600',
    },
  ];

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleStepAction = () => {
    if (currentStep.actionTab) {
      onSelectTab(currentStep.actionTab);
    } else if (currentStep.actionCart) {
      onOpenCart();
    }
    handleNext();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 select-none font-sans">
        {/* Dark Dimmed Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Floating Modal Tour Card */}
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-gradient-to-b from-[#181d22] to-[#0d1013] border border-brand-orange/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/90 text-white overflow-hidden"
        >
          {/* Ambient Corner Glow Effect */}
          <div className="absolute -top-16 -right-16 w-44 h-44 bg-brand-orange/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Header Row: Badge & Skip Button */}
          <div className="flex items-center justify-between mb-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-black uppercase tracking-wider text-amber-300">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{currentStep.badge}</span>
            </span>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Skip Tutorial"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Central Animated Icon Card */}
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${currentStep.accentColor} p-0.5 shadow-lg shadow-brand-orange/20 flex items-center justify-center shrink-0`}>
              <div className="w-full h-full bg-[#12161a] rounded-[14px] flex items-center justify-center">
                {currentStep.icon}
              </div>
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                {currentStep.title}
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-amber-400 mt-0.5">
                {currentStep.subtitle}
              </p>
            </div>
          </div>

          {/* Step Description */}
          <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed mb-6">
            {currentStep.description}
          </p>

          {/* Optional Quick-Action Shortcut (Peek at Menu, Open Cart) */}
          {currentStep.highlightActionLabel && (
            <div className="mb-5">
              <button
                type="button"
                onClick={handleStepAction}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-amber-400/40 text-amber-300 text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <span>{currentStep.highlightActionLabel}</span>
              </button>
            </div>
          )}

          {/* Step Progress Dots */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentStepIndex(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? 'w-7 bg-brand-orange shadow-md shadow-brand-orange/50'
                    : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* Footer Controls: Back, Skip, Next */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
            {isFirstStep ? (
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-gray-400 hover:text-white px-2 py-1.5 transition-colors cursor-pointer"
              >
                Skip Tour
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBack}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wide shadow-lg flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                isLastStep
                  ? 'bg-gradient-to-r from-brand-orange to-amber-500 hover:from-brand-orange/90 hover:to-amber-500/90 text-white shadow-brand-orange/30'
                  : 'bg-brand-orange hover:bg-brand-orange/90 text-white shadow-brand-orange/20'
              }`}
            >
              <span>{isLastStep ? 'Start Feasting 🍽️' : 'Next Step'}</span>
              {isLastStep ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
