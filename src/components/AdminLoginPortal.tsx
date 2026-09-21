/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TAASH BHATTI Master Administrator Two-Factor Authentication Portal
 * - Mandatory Auto-Dispatched 2FA OTP to Master Device
 * - Zero Client-Side Exposure of Master Administrator Phone
 * - Cryptographically Verified Session Gate
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  ArrowLeft, 
  RefreshCw, 
  Smartphone, 
  PhoneCall, 
  CheckCircle2, 
  Lock, 
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { setAdminSessionToken } from '../lib/security';

interface AdminLoginPortalProps {
  email?: string;
  onVerify: () => void;
  onCancel: () => void;
}

export default function AdminLoginPortal({ email: initialEmail = '', onVerify, onCancel }: AdminLoginPortalProps) {
  const [step, setStep] = useState<'dispatching' | 'otp_challenge' | 'success'>('dispatching');
  const [sessionId, setSessionId] = useState<string>('');
  const [maskedPhone, setMaskedPhone] = useState<string>('+91 ******9216');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | 'voice'>('whatsapp');
  const [countdown, setCountdown] = useState<number>(30);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-dispatch 2FA OTP immediately when administrator portal mounts
  useEffect(() => {
    let isMounted = true;

    async function autoDispatchOtp() {
      setStep('dispatching');
      setError(null);
      try {
        const res = await fetch('/api/admin/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: 'whatsapp' }),
        });

        const data = await res.json();
        if (!isMounted) return;

        if (res.ok && data.success && data.sessionId) {
          setSessionId(data.sessionId);
          if (data.maskedPhone) setMaskedPhone(data.maskedPhone);
          setChannel(data.channel || 'whatsapp');
          setStep('otp_challenge');
          setCountdown(30);
          setCanResend(false);
          // Focus first digit input
          setTimeout(() => {
            inputRefs.current[0]?.focus();
          }, 200);
        } else {
          setError(data.error || 'Failed to auto-dispatch master 2FA code. Please retry.');
          setStep('otp_challenge');
          setCanResend(true);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error auto-dispatching 2FA OTP:', err);
        setError('Network error: Unable to contact 2FA gateway. Please retry.');
        setStep('otp_challenge');
        setCanResend(true);
      }
    }

    autoDispatchOtp();

    return () => {
      isMounted = false;
    };
  }, []);

  // Countdown timer for code resend
  useEffect(() => {
    if (step !== 'otp_challenge' || canResend) return;

    if (countdown <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [step, countdown, canResend]);

  // Handle individual digit input
  const handleDigitChange = (index: number, value: string) => {
    // Keep only numbers
    const cleanVal = value.replace(/\D/g, '');

    if (cleanVal.length > 1) {
      // Handle paste of multiple digits
      const digits = cleanVal.slice(0, 6).split('');
      const newOtp = [...otpDigits];
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtpDigits(newOtp);
      const nextFocus = Math.min(index + digits.length, 5);
      inputRefs.current[nextFocus]?.focus();

      if (newOtp.every(d => d !== '')) {
        verifyOtpCode(newOtp.join(''));
      }
      return;
    }

    const newOtp = [...otpDigits];
    newOtp[index] = cleanVal;
    setOtpDigits(newOtp);

    // Auto-advance to next input
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits entered
    if (cleanVal && index === 5 && newOtp.every(d => d !== '')) {
      verifyOtpCode(newOtp.join(''));
    }
  };

  // Handle backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Resend 2FA OTP code
  const handleResend = async (resendChannel: 'whatsapp' | 'sms' | 'voice') => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: resendChannel }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.sessionId) {
        setSessionId(data.sessionId);
        if (data.maskedPhone) setMaskedPhone(data.maskedPhone);
        setChannel(resendChannel);
        setCountdown(30);
        setCanResend(false);
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 150);
      } else {
        setError(data.error || 'Failed to resend authorization code.');
      }
    } catch (err) {
      setError('Network error: Gateway unavailable.');
    } finally {
      setLoading(false);
    }
  };

  // Verify code with backend authority
  const verifyOtpCode = async (codeToVerify?: string) => {
    const fullOtp = codeToVerify || otpDigits.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the security verification code.');
      return;
    }

    if (!sessionId) {
      setError('Security session expired. Please request a new code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          otp: fullOtp,
          channel,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.adminToken) {
        // Securely store cryptographically verified token in sessionStorage
        setAdminSessionToken(data.adminToken);
        setStep('success');

        setTimeout(() => {
          onVerify();
        }, 800);
      } else {
        setError(data.error || 'Invalid or expired 2FA code. Access Denied.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error during 2FA verification:', err);
      setError('Communication error with 2FA verification server.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B0E] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Dynamic Cybersecurity Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(16,185,129,0.12)_0%,transparent_65%)] pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-green/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-[#10171D] border border-brand-green/25 rounded-3xl p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative z-10 backdrop-blur-xl"
      >
        {/* Brand Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="relative inline-block">
            <div className="w-16 h-16 bg-white border border-brand-orange/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner p-1 overflow-hidden">
              <img 
                src="https://cdn.postimage.me/2026/08/01/28172.png" 
                alt="TAASH BHATTI Logo" 
                className="w-full h-full object-contain rounded-xl" 
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-green border-2 border-[#10171D] rounded-full flex items-center justify-center text-[#070B0E] shadow">
              <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>

          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-white">
              TAASH BHATTI Master Gateway
            </h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/10 border border-brand-green/25 mt-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
              <span className="text-[10px] uppercase font-black text-brand-green tracking-widest">
                Mandatory Master 2FA Active
              </span>
            </div>
          </div>
        </div>

        {/* Step: Initial Auto-Dispatching Screen */}
        <AnimatePresence mode="wait">
          {step === 'dispatching' && (
            <motion.div
              key="dispatching"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-8 text-center space-y-4"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-green/10 border border-brand-green/30 flex items-center justify-center">
                <RefreshCw className="w-7 h-7 text-brand-green animate-spin" />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-black uppercase tracking-wider text-white">
                  Auto-Dispatching 2FA Code
                </p>
                <p className="text-[11px] text-gray-400 font-medium px-4">
                  Connecting to master device authority node. Dispatching one-time authorization code...
                </p>
              </div>
            </motion.div>
          )}

          {/* Step: OTP Challenge Screen */}
          {step === 'otp_challenge' && (
            <motion.div
              key="otp_challenge"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Notification Banner */}
              <div className="bg-[#0B1015] border border-brand-green/20 rounded-2xl p-4 text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-brand-green">
                  <Smartphone className="w-4 h-4" />
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    Master Device Verification
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  A 6-digit one-time authorization code was auto-dispatched to the authorized administrator device:
                </p>
                <div className="inline-block bg-[#16221D] border border-brand-green/40 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold text-brand-green tracking-widest shadow-inner">
                  {maskedPhone}
                </div>
              </div>

              {/* 6-Digit OTP Inputs */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block text-center">
                  Enter 6-Digit Authorization Code
                </label>
                <div className="flex justify-between gap-2 max-w-[320px] mx-auto">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className={`w-11 h-13 text-center text-lg font-mono font-bold rounded-xl border transition-all focus:outline-none ${
                        digit 
                          ? 'bg-brand-green/10 border-brand-green text-brand-green shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                          : 'bg-[#0B1015] border-gray-700 text-white focus:border-brand-green/60'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-[11px] font-semibold"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Verify & Unlock Button */}
              <button
                type="button"
                onClick={() => verifyOtpCode()}
                disabled={loading || otpDigits.some(d => d === '')}
                className="w-full bg-brand-green hover:bg-brand-green/90 text-[#070B0E] font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.98]"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-[#070B0E] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>AUTHORIZE & ENTER CONSOLE ➜</span>
                  </>
                )}
              </button>

              {/* Resend Controls */}
              <div className="pt-2 border-t border-gray-800 text-center space-y-2">
                {!canResend ? (
                  <p className="text-[10px] text-gray-500 font-mono">
                    Resend code available in <span className="text-brand-green font-bold">{countdown}s</span>
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleResend('whatsapp')}
                      disabled={loading}
                      className="text-brand-green hover:underline font-bold px-2 py-1 rounded bg-brand-green/10 flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" /> Resend WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResend('sms')}
                      disabled={loading}
                      className="text-gray-300 hover:underline font-bold px-2 py-1 rounded bg-gray-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Smartphone className="w-3 h-3" /> Resend SMS
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResend('voice')}
                      disabled={loading}
                      className="text-amber-400 hover:underline font-bold px-2 py-1 rounded bg-amber-500/10 flex items-center gap-1 cursor-pointer"
                    >
                      <PhoneCall className="w-3 h-3" /> Voice Call
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step: Success Screen */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-8 text-center space-y-3"
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-brand-green/20 border border-brand-green flex items-center justify-center text-brand-green">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-wider text-brand-green">
                  Authorization Verified ✓
                </p>
                <p className="text-[11px] text-gray-400 font-mono">
                  Session Token Minted. Opening Console...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Exit / Cancel Gateway */}
        <div className="mt-6 pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={onCancel}
            className="w-full border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white transition-all font-black text-[10px] uppercase py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> CANCEL & EXIT GATEWAY
          </button>
        </div>
      </motion.div>

      {/* Zero-Trust Compliance Footer */}
      <div className="mt-6 text-center space-y-1">
        <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">
          SECURITY PROTOCOL • TAASH BHATTI ZERO-TRUST 2FA
        </p>
        <p className="text-[8px] text-gray-700 max-w-sm mx-auto">
          Administrative access is secured via automated physical device challenge. Direct route bypasses and console overrides are blocked.
        </p>
      </div>
    </div>
  );
}
