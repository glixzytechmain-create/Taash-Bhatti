import React from 'react';
import { ShieldCheck, Lock, CheckCircle2, Cpu } from 'lucide-react';

interface IdentityVerificationModalProps {
  isOpen: boolean;
  step: 'scanning' | 'verifying' | 'confirmed';
  title: string;
  subtitle: string;
}

export default function IdentityVerificationModal({
  isOpen,
  step,
  title,
  subtitle,
}: IdentityVerificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#080B0E]/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 font-sans animate-fade-in">
      <div className="max-w-sm w-full bg-[#11171E] border border-brand-green/30 rounded-3xl p-8 text-center shadow-[0_0_60px_rgba(0,0,0,0.8)] space-y-6 relative overflow-hidden">
        
        {/* Glowing Background Radial */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-green/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />

        {/* Central Graphic Container */}
        <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
          {step === 'scanning' && (
            <>
              <div className="absolute inset-0 border-2 border-dashed border-brand-green/60 rounded-full animate-[spin_8s_linear_infinite]" />
              <div className="absolute inset-2 border border-brand-green/20 rounded-full animate-ping opacity-20" />
              <div className="w-16 h-16 rounded-2xl bg-brand-green/10 border border-brand-green/40 text-brand-green flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-8 h-8 animate-pulse text-brand-green" />
              </div>
            </>
          )}

          {step === 'verifying' && (
            <>
              <div className="absolute inset-0 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
              <div className="w-16 h-16 rounded-2xl bg-brand-orange/10 border border-brand-orange/40 text-brand-orange flex items-center justify-center shadow-lg">
                <Lock className="w-8 h-8 text-brand-orange animate-bounce" />
              </div>
            </>
          )}

          {step === 'confirmed' && (
            <>
              <div className="absolute inset-0 bg-emerald-500/20 border-2 border-emerald-400 rounded-full animate-pulse shadow-[0_0_30px_rgba(52,211,153,0.4)]" />
              <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-400 text-emerald-400 flex items-center justify-center shadow-xl">
                <CheckCircle2 className="w-9 h-9 text-emerald-400 scale-110 transition-transform" />
              </div>
            </>
          )}
        </div>

        {/* Step Progress Indicators */}
        <div className="flex items-center justify-center gap-2">
          <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 'scanning' ? 'w-8 bg-brand-green shadow-sm shadow-brand-green/50' : 'w-2 bg-white/20'}`} />
          <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 'verifying' ? 'w-8 bg-brand-orange shadow-sm shadow-brand-orange/50' : step === 'confirmed' ? 'w-2 bg-emerald-400' : 'w-2 bg-white/20'}`} />
          <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 'confirmed' ? 'w-8 bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'w-2 bg-white/20'}`} />
        </div>

        {/* Status Text Block */}
        <div className="space-y-2">
          <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center justify-center gap-2">
            <Cpu className="w-4 h-4 text-brand-green animate-pulse" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-gray-400 font-mono leading-relaxed max-w-xs mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Security Footer Badge */}
        <div className="pt-2 border-t border-white/10 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
          FitZaika Cloud Security • AES-256 Verified
        </div>
      </div>
    </div>
  );
}
