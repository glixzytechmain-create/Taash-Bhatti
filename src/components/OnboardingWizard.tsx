import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../types';
import { Check, ArrowRight, ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';

interface OnboardingWizardProps {
  user: User;
  onComplete: (updatedUser: Partial<User>) => void;
  onSkip?: () => void;
  allGyms?: any[];
}

const AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&auto=format&fit=crop&q=80',
];

export default function OnboardingWizard({ user, onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);

  // Form states
  const [name, setName] = useState(user.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar || AVATARS[0]);

  const handleNext = () => {
    if (step < 2) {
      setStep((prev) => prev + 1);
    } else {
      onComplete({
        name,
        avatar: selectedAvatar,
        onboardingCompleted: true,
      });
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F13] text-white flex flex-col justify-between overflow-y-auto">
      {/* HEADER BAR */}
      <header className="w-full max-w-4xl mx-auto px-6 pt-6 pb-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white border border-brand-orange/30 flex items-center justify-center p-0.5 overflow-hidden shrink-0">
            <img src="https://cdn.postimage.me/2026/08/01/28172.png" alt="TAASH BHATTI" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white uppercase">
              TAASH <span className="text-brand-orange">BHATTI</span>
            </h1>
            <p className="text-[10px] text-gray-400 font-mono">ACCOUNT SETUP</p>
          </div>
        </div>

        {onSkip && (
          <button
            onClick={onSkip}
            className="text-xs text-gray-400 hover:text-white font-bold uppercase transition-all cursor-pointer"
          >
            Skip Setup ✕
          </button>
        )}
      </header>

      {/* STEP PROGRESS LINE */}
      <div className="w-full max-w-4xl mx-auto px-6 py-2">
        <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase mb-1.5">
          <span>STEP {step + 1} OF 3</span>
          <span className="text-brand-orange">{Math.round(((step + 1) / 3) * 100)}% COMPLETED</span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-orange transition-all duration-300"
            style={{ width: `${((step + 1) / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* MAIN STEP CONTENT */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md text-center space-y-6"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-black bg-brand-orange/10 text-brand-orange px-3 py-1 rounded-full border border-brand-orange/20 uppercase tracking-widest">
                  STEP 1 OF 3
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                  Welcome to <span className="text-brand-orange">TAASH BHATTI</span>
                </h2>
                <p className="text-xs text-gray-400">
                  Let's personalize your account profile.
                </p>
              </div>

              {/* NAME INPUT */}
              <div className="text-left space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-300">
                  Your Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-brand-orange text-white"
                />
              </div>

              {/* AVATAR SELECTOR */}
              <div className="space-y-3 text-left">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-300">
                  Choose Profile Avatar
                </label>
                <div className="flex items-center justify-between gap-3">
                  {AVATARS.map((avatarUrl, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedAvatar(avatarUrl)}
                      className={`relative w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedAvatar === avatarUrl
                          ? 'border-brand-orange scale-110 shadow-lg'
                          : 'border-white/10 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      {selectedAvatar === avatarUrl && (
                        <div className="absolute inset-0 bg-brand-orange/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md text-center space-y-6"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-black bg-brand-orange/10 text-brand-orange px-3 py-1 rounded-full border border-brand-orange/20 uppercase tracking-widest">
                  STEP 2 OF 3
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                  Delivery <span className="text-brand-orange">Preferences</span>
                </h2>
                <p className="text-xs text-gray-400">
                  Fresh gourmet meals dispatched straight to your location.
                </p>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/10 rounded-3xl space-y-4 text-left">
                <div className="flex items-center gap-3 text-brand-orange">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-xs font-bold text-white uppercase">Piping Hot Delivery Guarantee</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  All dishes are cooked fresh to order by certified culinary chefs and dispatched in insulated thermal carriers within minutes.
                </p>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md text-center space-y-6"
            >
              <div className="w-16 h-16 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center mx-auto border border-brand-orange/20 shadow-xl">
                <ShieldCheck className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                  Account <span className="text-brand-orange">Ready</span>
                </h2>
                <p className="text-xs text-gray-400">
                  Your profile has been created successfully!
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-5 flex items-center gap-4 text-left">
                <img src={selectedAvatar} alt="Profile Avatar" className="w-14 h-14 rounded-2xl object-cover border border-brand-orange/30" />
                <div>
                  <h4 className="font-extrabold text-sm text-white uppercase">{name || 'Gourmet Foodie'}</h4>
                  <p className="text-xs text-brand-orange font-bold mt-0.5">Ready to order</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER BAR */}
      <footer className="w-full max-w-md mx-auto px-6 py-6 flex items-center justify-between border-t border-white/5">
        {step > 0 ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 px-5 py-3 rounded-2xl border border-white/10 text-white font-bold text-xs uppercase hover:bg-white/5 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-brand-orange hover:bg-brand-orange/90 text-brand-charcoal font-black text-xs uppercase transition-all shadow-lg cursor-pointer"
        >
          {step === 2 ? 'Start Exploring Menu 🚀' : 'Continue'} <ArrowRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
}
