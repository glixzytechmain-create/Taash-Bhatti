import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, CheckCircle2, Zap, Radio, RefreshCw, Sparkles, UserCheck } from 'lucide-react';

interface AuthVerifyingOverlayProps {
  userDisplayName?: string | null;
  userEmail?: string | null;
  isLoggedIn?: boolean;
  onFinish?: () => void;
}

export default function AuthVerifyingOverlay({
  userDisplayName,
  userEmail,
  isLoggedIn = false,
  onFinish,
}: AuthVerifyingOverlayProps) {
  const [progress, setProgress] = useState(15);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    // Step 1: Checking Local Tokens (0-300ms)
    const t1 = setTimeout(() => {
      setProgress(45);
      setCurrentStep(2);
    }, 400);

    // Step 2: Verifying Firebase Auth (400-800ms)
    const t2 = setTimeout(() => {
      setProgress(85);
      setCurrentStep(3);
    }, 900);

    // Step 3: Restoring Session (800-1300ms)
    const t3 = setTimeout(() => {
      setProgress(100);
      setCompleted(true);
    }, 1300);

    // Transition out
    const t4 = setTimeout(() => {
      if (onFinish) onFinish();
    }, 1700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0A0E12] flex flex-col items-center justify-center p-6 text-white overflow-hidden select-none">
      {/* Background Radial Glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none -top-20 -left-20" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-brand-orange/10 blur-[100px] pointer-events-none -bottom-20 -right-20" />

      {/* Main Container Card */}
      <div className="relative w-full max-w-md bg-[#121820]/90 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center space-y-6">
        
        {/* Animated Brand Logo & Radar Rings */}
        <div className="relative flex items-center justify-center my-2">
          {/* Outer Pulsing Radar Rings */}
          <span className="absolute -inset-6 rounded-full border border-emerald-500/30 animate-ping pointer-events-none" style={{ animationDuration: '2.5s' }} />
          <span className="absolute -inset-10 rounded-full border border-amber-500/20 animate-pulse pointer-events-none" />

          {/* Central Shield Container */}
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 p-0.5 shadow-2xl">
            <div className="w-full h-full bg-[#0D1217] rounded-[22px] flex items-center justify-center relative overflow-hidden">
              {completed ? (
                <UserCheck className="w-10 h-10 text-emerald-400 animate-bounce" />
              ) : (
                <ShieldCheck className="w-10 h-10 text-emerald-400 animate-pulse" />
              )}
            </div>
          </div>

          {/* Floating Security Badge */}
          <div className="absolute -bottom-2 bg-emerald-950 border border-emerald-400/50 text-emerald-300 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-lg">
            <Radio className="w-3 h-3 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
            <span>256-Bit SSL</span>
          </div>
        </div>

        {/* Title & App Branding */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-amber-400 tracking-widest uppercase mb-2">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>TAASH BHATTI Cloud Vault</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Verifying Authentication
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Restoring your secure account session & dining preferences...
          </p>
        </div>

        {/* Live Step Progress Checklist */}
        <div className="w-full bg-[#0A0D12] border border-white/10 rounded-2xl p-4 text-left space-y-3">
          {/* Step 1 */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                currentStep > 1 ? 'bg-emerald-500 text-black' : currentStep === 1 ? 'bg-amber-500 text-black animate-pulse' : 'bg-white/10 text-gray-500'
              }`}>
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span className={currentStep >= 1 ? 'text-gray-200 font-semibold' : 'text-gray-500'}>
                Local Encrypted Token Vault
              </span>
            </div>
            {currentStep > 1 && <span className="text-[10px] font-mono text-emerald-400 font-bold">VERIFIED</span>}
          </div>

          {/* Step 2 */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                currentStep > 2 ? 'bg-emerald-500 text-black' : currentStep === 2 ? 'bg-amber-500 text-black animate-pulse' : 'bg-white/10 text-gray-500'
              }`}>
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <span className={currentStep >= 2 ? 'text-gray-200 font-semibold' : 'text-gray-500'}>
                Firebase Cloud OAuth Security
              </span>
            </div>
            {currentStep > 2 && <span className="text-[10px] font-mono text-emerald-400 font-bold">ACTIVE</span>}
          </div>

          {/* Step 3 */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                completed ? 'bg-emerald-500 text-black' : currentStep === 3 ? 'bg-amber-500 text-black animate-pulse' : 'bg-white/10 text-gray-500'
              }`}>
                {completed ? '✓' : '3'}
              </div>
              <span className={currentStep >= 3 ? 'text-gray-200 font-semibold' : 'text-gray-500'}>
                Syncing Session & Feast Profile
              </span>
            </div>
            {completed && <span className="text-[10px] font-mono text-emerald-400 font-bold">READY</span>}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-2">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-gray-400">SESSION RESTORATION</span>
            <span className="text-emerald-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* User Identity Confirmation Pill */}
        {completed && (
          <div className="w-full bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-3 text-center animate-fade-in">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-0.5">
              {isLoggedIn ? 'AUTHENTICATED CUSTOMER' : 'GUEST SESSION'}
            </span>
            <span className="text-xs font-bold text-white truncate block">
              {isLoggedIn ? (userDisplayName || userEmail || 'Signed-In Customer') : 'Guest Session Ready'}
            </span>
          </div>
        )}

        <p className="text-[10px] text-gray-500 font-mono">
          TAASH BHATTI Cloud Security • Anti-Session Dropping Active
        </p>
      </div>
    </div>
  );
}
