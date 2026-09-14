import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  Sparkles, 
  KeyRound, 
  UserCheck, 
  Compass, 
  UtensilsCrossed,
  ArrowRight,
  Zap,
  Radio
} from 'lucide-react';

export interface OnboardingFlowModalProps {
  isOpen: boolean;
  userDisplayName?: string | null;
  userPhone?: string | null;
  mode?: 'login' | 'signup' | 'restore';
  savedAddressCount?: number;
  savedAddressPrimary?: string | null;
  onComplete: () => void;
}

export default function OnboardingFlowModal({
  isOpen,
  userDisplayName,
  userPhone,
  mode = 'login',
  savedAddressCount = 0,
  savedAddressPrimary,
  onComplete,
}: OnboardingFlowModalProps) {
  // Step index: 0, 1, 2, 3
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Define steps with dynamic labels based on mode and detected address status
  const steps = [
    {
      id: 'auth',
      badge: 'Step 1 of 4',
      title: mode === 'signup' ? 'Profile Registration' : 'Credentials & Session Vault',
      subtitle: mode === 'signup'
        ? 'Creating encrypted account tokens & securing credentials...'
        : 'Verifying cryptographic access tokens & cloud identity...',
      icon: <KeyRound className="w-5 h-5 text-amber-400" />,
      tag: 'AUTHENTICATED',
    },
    {
      id: 'profile',
      badge: 'Step 2 of 4',
      title: 'Gourmet Profile & Preferences',
      subtitle: 'Calibrating diet goals, feast favorites & taste profile...',
      icon: <UserCheck className="w-5 h-5 text-emerald-400" />,
      tag: 'SYNCED',
    },
    {
      id: 'location',
      badge: 'Step 3 of 4',
      title: 'Syncing Saved Delivery Address',
      subtitle: savedAddressCount > 0
        ? `Found ${savedAddressCount} saved doorstep address! Locking "${savedAddressPrimary?.slice(0, 28) || 'Home'}${savedAddressPrimary && savedAddressPrimary.length > 28 ? '...' : ''}" to header.`
        : 'Verifying service kitchen geofences & delivery radius...',
      icon: <Compass className="w-5 h-5 text-amber-400" />,
      tag: savedAddressCount > 0 ? `${savedAddressCount} SAVED` : 'VERIFIED',
    },
    {
      id: 'ready',
      badge: 'Step 4 of 4',
      title: 'Preparing Your Gourmet Kitchen',
      subtitle: 'Live kitchen stations, bhatti grills & member pricing active!',
      icon: <UtensilsCrossed className="w-5 h-5 text-emerald-400" />,
      tag: 'READY',
    },
  ];

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setIsFinished(false);
      return;
    }

    // Step 0 -> Step 1 after 850ms
    const t0 = setTimeout(() => {
      setCurrentStepIndex(1);
    }, 850);

    // Step 1 -> Step 2 (Dedicated location verification step) after 1750ms
    const t1 = setTimeout(() => {
      setCurrentStepIndex(2);
    }, 1750);

    // Step 2 -> Step 3 (Ready confirmation) after 2750ms
    const t2 = setTimeout(() => {
      setCurrentStepIndex(3);
    }, 2750);

    // Step 3 finished mark after 3600ms
    const t3 = setTimeout(() => {
      setIsFinished(true);
    }, 3600);

    // Complete onboarding transition after 4200ms
    const t4 = setTimeout(() => {
      onComplete();
    }, 4200);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  const currentStep = steps[currentStepIndex] || steps[steps.length - 1];
  const progressPercent = Math.min(100, Math.round(((currentStepIndex + (isFinished ? 1 : 0.45)) / steps.length) * 100));

  return (
    <div
      id="onboarding-flow-modal-backdrop"
      className="fixed inset-0 z-[10000] bg-[#070A0D]/95 backdrop-blur-2xl flex items-center justify-center p-4 select-none overflow-hidden"
    >
      {/* Dynamic Ambient Radiant Glows */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full bg-amber-500/15 blur-[130px] pointer-events-none -top-24 -left-24 animate-pulse" 
        style={{ animationDuration: '4s' }} 
      />
      <div 
        className="absolute w-[480px] h-[480px] rounded-full bg-emerald-500/15 blur-[120px] pointer-events-none -bottom-24 -right-24 animate-pulse" 
        style={{ animationDuration: '5s' }} 
      />

      {/* Main Experience Card */}
      <motion.div
        id="onboarding-flow-card"
        initial={{ opacity: 0, scale: 0.88, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: -15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md bg-gradient-to-b from-[#141B22] via-[#0E141B] to-[#0A0E13] border border-amber-500/30 rounded-[36px] p-7 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.9)] flex flex-col items-center text-center overflow-hidden"
      >
        {/* Subtle top gold accent line */}
        <div className="absolute top-0 inset-x-8 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        {/* 1. BIG BRAND LOGO WITH GLOWING RADAR RINGS & PARTICLES */}
        <div className="relative flex items-center justify-center mt-2 mb-4">
          {/* Outer Pulsing Glow Rings */}
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0.6, 0.25] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-6 rounded-full border border-amber-400/35 blur-[1px] pointer-events-none"
          />
          <motion.div
            animate={{ scale: [1, 1.45, 1], opacity: [0.1, 0.35, 0.1] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            className="absolute -inset-10 rounded-full border border-emerald-400/25 pointer-events-none"
          />

          {/* Golden Rotating Particle Beads */}
          {[0, 90, 180, 270].map((angle, i) => (
            <motion.div
              key={i}
              animate={{ rotate: 360 }}
              transition={{ duration: 6.5, repeat: Infinity, ease: 'linear' }}
              className="absolute w-28 h-28 pointer-events-none"
              style={{ transformOrigin: 'center center' }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 shadow-[0_0_10px_#ff9900]"
                style={{
                  position: 'absolute',
                  top: '0px',
                  left: '50%',
                  transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                }}
              />
            </motion.div>
          ))}

          {/* Big Brand Logo Box */}
          <div className="relative p-1 rounded-[28px] bg-gradient-to-b from-amber-400/60 via-orange-500/40 to-emerald-500/30 shadow-[0_10px_35px_rgba(255,140,0,0.35)]">
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-[#090D11] rounded-[26px] flex items-center justify-center p-3.5 overflow-hidden relative group">
              {/* Shimmer bar pass */}
              <motion.div
                initial={{ x: '-150%' }}
                animate={{ x: '180%' }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-amber-200/25 to-transparent skew-x-12 pointer-events-none"
              />

              <img
                src="https://cdn.postimage.me/2026/08/01/28172.png"
                alt="TAASH BHATTI"
                className="w-full h-full object-contain filter drop-shadow-[0_4px_14px_rgba(255,100,0,0.7)]"
              />
            </div>
          </div>
        </div>

        {/* 2. BRAND TITLE & GOURMET MOTTO */}
        <div className="space-y-1.5 mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-black text-amber-300 uppercase tracking-widest shadow-inner">
            <Sparkles className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>TAASH BHATTI GOURMET VAULT</span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight uppercase">
            {mode === 'signup' ? 'Welcome, Athlete!' : 'Authenticating Session'}
          </h2>

          <p className="text-xs text-gray-300 font-medium max-w-xs mx-auto">
            {userDisplayName ? `Synchronizing profile for ${userDisplayName}...` : userPhone ? `Connected as ${userPhone}...` : 'Configuring your personalized gourmet experience...'}
          </p>
        </div>

        {/* 3. STEP-BY-STEP TRANSITION STAGE (SHOWS ONE STEP AT A TIME WITH AWESOME ANIMATION) */}
        <div className="w-full bg-[#080B0F]/90 border border-white/10 rounded-2xl p-4 sm:p-5 relative min-h-[120px] flex flex-col justify-center overflow-hidden mb-5">
          {/* Active bottom glow bar */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500 opacity-80" />

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.94 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex items-center gap-3.5 text-left"
            >
              {/* Step Icon with Pulse */}
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                  {currentStep.icon}
                </div>
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 animate-ping" />
              </div>

              {/* Step Texts */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono font-black text-amber-400 tracking-wider uppercase">
                    {currentStep.badge}
                  </span>
                  {currentStepIndex === 2 && savedAddressCount > 0 ? (
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-bold">
                      ✓ {savedAddressCount} ADDRESS{savedAddressCount > 1 ? 'ES' : ''} DETECTED
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-white/10 text-gray-300 rounded-full font-bold">
                      IN PROGRESS
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-black text-white tracking-wide truncate">
                  {currentStep.title}
                </h3>
                <p className="text-[11px] text-gray-400 leading-snug mt-0.5 font-sans line-clamp-2">
                  {currentStep.subtitle}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 4. STEP DOTS / PROGRESS INDICATOR */}
        <div className="w-full space-y-2 mb-4">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-gray-400 font-bold uppercase tracking-wider">SYSTEM SYNCHRONIZATION</span>
            <span className="text-amber-400 font-extrabold">{progressPercent}%</span>
          </div>

          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-emerald-400 rounded-full"
              initial={{ width: '15%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.45, ease: 'easeInOut' }}
            />
          </div>

          {/* Stepper Dots Bar */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {steps.map((s, idx) => {
              const isPast = currentStepIndex > idx;
              const isCurrent = currentStepIndex === idx;
              return (
                <div key={s.id} className="flex flex-col items-center gap-1">
                  <div
                    className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                      isPast || (isCurrent && isFinished)
                        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                        : isCurrent
                        ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                        : 'bg-white/10'
                    }`}
                  />
                  <span
                    className={`text-[9px] font-mono truncate transition-colors ${
                      isCurrent ? 'text-amber-300 font-bold' : isPast ? 'text-emerald-400' : 'text-gray-600'
                    }`}
                  >
                    {idx === 0 ? 'Auth' : idx === 1 ? 'Profile' : idx === 2 ? 'Location' : 'Ready'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. FOOTER ASSURANCE BADGE */}
        <div className="pt-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>TAASH BHATTI Geofence & Session Engine • Verified</span>
        </div>
      </motion.div>
    </div>
  );
}
