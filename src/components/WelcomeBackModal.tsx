import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MapPin, CheckCircle2, ChevronRight, X, User as UserIcon } from 'lucide-react';

interface WelcomeBackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  avatar?: string;
  address?: string;
  addressCount: number;
  onChangeAddress?: () => void;
}

export default function WelcomeBackModal({
  isOpen,
  onClose,
  userName,
  avatar,
  address,
  addressCount,
  onChangeAddress,
}: WelcomeBackModalProps) {
  // Automatically dismiss after 5 seconds
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, 5500);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="welcome-back-modal-overlay"
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          id="welcome-back-card"
          initial={{ opacity: 0, scale: 0.88, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -16 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-emerald-950/40 to-slate-950 border-2 border-emerald-500/50 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(16,185,129,0.3)] text-white overflow-hidden"
        >
          {/* Decorative ambient background glows */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            id="welcome-back-close-btn"
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top Pill: Verified Athlete */}
          <div className="flex items-center gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-inner">
              <Sparkles className="w-3 h-3 text-emerald-400 animate-spin" />
              <span>ATHLETE VERIFIED • WELCOME BACK</span>
            </span>
          </div>

          {/* User Profile Avatar & Header */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt={userName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-400 shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 border-2 border-emerald-400 flex items-center justify-center text-white font-black text-xl shadow-md">
                  {userName.charAt(0).toUpperCase() || <UserIcon className="w-7 h-7 text-white" />}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[10px]">
                ✓
              </span>
            </div>

            <div className="min-w-0">
              <h3 className="text-xl font-black text-white tracking-tight leading-tight truncate">
                Welcome back, {userName}!
              </h3>
              <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Account & delivery preferences loaded</span>
              </p>
            </div>
          </div>

          {/* Saved Address Confirmation Box */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 mb-5 shadow-inner">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-black uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                <span>Active Delivery Destination</span>
              </div>
              {addressCount > 1 && (
                <span className="text-[10px] text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  {addressCount} saved addresses
                </span>
              )}
            </div>

            <p className="text-sm font-bold text-slate-100 leading-snug line-clamp-2">
              {address || 'Your saved primary doorstep address'}
            </p>

            <div className="mt-2.5 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
              <span className="text-emerald-300 font-medium">✓ Ready for instant high-protein delivery</span>
              {onChangeAddress && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onChangeAddress();
                  }}
                  className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer text-[11px]"
                >
                  Change
                </button>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-2">
            <button
              id="welcome-back-continue-btn"
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Let's Eat • Explore Kitchen Menu</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Subtle auto-dismiss progress bar */}
          <div className="w-full bg-white/10 h-1 rounded-full mt-4 overflow-hidden">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5.5, ease: 'linear' }}
              className="h-full bg-emerald-400"
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
