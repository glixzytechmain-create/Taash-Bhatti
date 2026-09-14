/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Lock,
  ChevronDown,
  LogOut,
  Sparkles,
  X,
  HelpCircle,
  ExternalLink,
  Info,
  Copy,
  Check,
  MessageSquare,
  PhoneCall,
  Radio,
  Send
} from 'lucide-react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
  ConfirmationResult,
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { User } from '../types';

interface CountryCode {
  code: string;
  name: string;
  flag: string;
  format: string;
  length: number;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: '+91', name: 'India', flag: '🇮🇳', format: '98765 43210', length: 10 },
  { code: '+1', name: 'United States / Canada', flag: '🇺🇸', format: '(555) 000-0000', length: 10 },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧', format: '7911 123456', length: 10 },
  { code: '+971', name: 'UAE', flag: '🇦🇪', format: '50 123 4567', length: 9 },
  { code: '+65', name: 'Singapore', flag: '🇸🇬', format: '8123 4567', length: 8 },
  { code: '+61', name: 'Australia', flag: '🇦🇺', format: '412 345 678', length: 9 },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦', format: '50 123 4567', length: 9 },
  { code: '+49', name: 'Germany', flag: '🇩🇪', format: '151 12345678', length: 10 },
];

interface MandatoryPhoneVerificationModalProps {
  isOpen: boolean;
  user: User;
  onSuccess: (verifiedPhone: string) => void;
  onSignOut: () => void;
  onDismiss?: () => void;
}

export const MandatoryPhoneVerificationModal: React.FC<MandatoryPhoneVerificationModalProps> = ({
  isOpen,
  user,
  onSuccess,
  onSignOut,
  onDismiss,
}) => {
  const [step, setStep] = useState<'phone_input' | 'otp_input' | 'verified'>('phone_input');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [showCountryPicker, setShowCountryPicker] = useState<boolean>(false);
  const [showHelpGuide, setShowHelpGuide] = useState<boolean>(false);

  // OTP delivery channel & timer
  const [otpChannel, setOtpChannel] = useState<'whatsapp' | 'voice' | 'sms'>('whatsapp');
  const [lastDispatchedChannel, setLastDispatchedChannel] = useState<'whatsapp' | 'voice' | 'sms'>('whatsapp');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpSessionId, setOtpSessionId] = useState<string | null>(null);

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [domainCopied, setDomainCopied] = useState<boolean>(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {}
        recaptchaVerifierRef.current = null;
      }
      if (typeof window !== 'undefined' && (window as any).mandatoryRecaptchaVerifier) {
        try {
          (window as any).mandatoryRecaptchaVerifier.clear();
        } catch (e) {}
        (window as any).mandatoryRecaptchaVerifier = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const fullE164Phone = `${selectedCountry.code}${cleanPhone}`;

  const setupRecaptcha = (): RecaptchaVerifier | null => {
    if (typeof window === 'undefined') return null;

    try {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {}
        recaptchaVerifierRef.current = null;
      }

      if ((window as any).mandatoryRecaptchaVerifier) {
        try {
          (window as any).mandatoryRecaptchaVerifier.clear();
        } catch (e) {}
        (window as any).mandatoryRecaptchaVerifier = null;
      }

      const container = document.getElementById('mandatory-recaptcha-container');
      if (container) {
        container.innerHTML = '';
      }

      const verifier = new RecaptchaVerifier(auth, 'mandatory-recaptcha-container', {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => {
          setErrorMessage('Verification expired. Please request a new SMS code.');
        },
      });

      recaptchaVerifierRef.current = verifier;
      (window as any).mandatoryRecaptchaVerifier = verifier;
      return verifier;
    } catch (err: any) {
      console.warn('reCAPTCHA setup warning:', err);
      return null;
    }
  };

  const handleSendOtp = async (channelOverride?: 'whatsapp' | 'voice' | 'sms') => {
    setErrorMessage(null);
    setInfoMessage(null);

    // Ensure channelOverride is strictly one of the allowed strings and not an event object
    const validChannels = ['whatsapp', 'voice', 'sms'] as const;
    const channelToUse: 'whatsapp' | 'voice' | 'sms' = 
      (typeof channelOverride === 'string' && validChannels.includes(channelOverride as any))
        ? channelOverride
        : otpChannel;

    if (typeof channelOverride === 'string' && validChannels.includes(channelOverride as any)) {
      setOtpChannel(channelOverride);
    }

    if (!cleanPhone || cleanPhone.length < selectedCountry.length - 2) {
      setErrorMessage(`Please enter a valid ${selectedCountry.length}-digit mobile phone number.`);
      return;
    }

    setLoading(true);

    try {
      // If user selected SMS explicitly, route directly through Firebase Phone Auth
      if (channelToUse === 'sms') {
        const verifier = setupRecaptcha();
        if (!verifier) {
          throw new Error("reCAPTCHA container initialization failed.");
        }
        const result = await signInWithPhoneNumber(auth, fullE164Phone, verifier);
        setConfirmationResult(result);
        setOtpSessionId(null);
        setLastDispatchedChannel('sms');
        setStep('otp_input');
        setTimerSeconds(60);
        setIsTimerRunning(true);
        setInfoMessage(`Firebase SMS verification code sent to ${fullE164Phone}`);

        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 300);
        return;
      }

      // If user selected WhatsApp or Voice Call, route through 2Factor.in Gateway
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullE164Phone, channel: channelToUse }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.sessionId) {
        setOtpSessionId(data.sessionId);
        setConfirmationResult(null);
        setLastDispatchedChannel(channelToUse);
        setStep('otp_input');
        setTimerSeconds(60);
        setIsTimerRunning(true);

        const channelNames = {
          whatsapp: 'WhatsApp message',
          voice: 'Automated Voice Call',
          sms: 'Firebase SMS'
        };
        setInfoMessage(`⚡ OTP dispatched via ${channelNames[channelToUse]} to ${fullE164Phone}`);

        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 300);
        return;
      } else {
        console.warn('2Factor API route response:', data);
        // Fallback to Firebase Phone Auth SMS if 2Factor fails
        const verifier = setupRecaptcha();
        if (verifier) {
          const result = await signInWithPhoneNumber(auth, fullE164Phone, verifier);
          setConfirmationResult(result);
          setOtpSessionId(null);
          setLastDispatchedChannel('sms');
          setStep('otp_input');
          setTimerSeconds(60);
          setIsTimerRunning(true);
          setInfoMessage(`Switched to Firebase SMS verification code: sent to ${fullE164Phone}`);

          setTimeout(() => {
            inputRefs.current[0]?.focus();
          }, 300);
          return;
        }
        throw new Error(data.error || 'Failed to dispatch OTP. Please check your number.');
      }
    } catch (err: any) {
      console.error('OTP Send error:', err);
      setErrorMessage(err?.message || 'Failed to dispatch OTP. Please verify your phone number and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const cleanChar = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (cleanChar.length > 0) {
      newDigits[index] = cleanChar[cleanChar.length - 1];
      setOtpDigits(newDigits);

      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      } else {
        const fullOtp = newDigits.join('');
        if (fullOtp.length === 6) {
          handleVerifyOtp(fullOtp);
        }
      }
    } else {
      newDigits[index] = '';
      setOtpDigits(newDigits);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    if (pastedData.length >= 6) {
      const pasteDigits = pastedData.slice(0, 6).split('');
      setOtpDigits(pasteDigits);
      inputRefs.current[5]?.focus();
      handleVerifyOtp(pasteDigits.join(''));
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    setErrorMessage(null);

    if (code.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);

    try {
      // 1. Verify with 2Factor if active session exists
      if (otpSessionId) {
        const res = await fetch('/api/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: otpSessionId,
            otp: code,
            phone: fullE164Phone,
            channel: lastDispatchedChannel,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success || !data.verified) {
          throw new Error(data.error || 'Incorrect OTP code entered. Please check the code and try again.');
        }
      } else if (confirmationResult) {
        // Confirm with Firebase Auth
        await confirmationResult.confirm(code);
      } else {
        throw new Error('Verification session expired. Please request a new verification code.');
      }

      // Attempt to link phone credential to current logged-in user if applicable
      try {
        if (auth.currentUser && confirmationResult?.verificationId) {
          const phoneCred = PhoneAuthProvider.credential(confirmationResult.verificationId, code);
          await linkWithCredential(auth.currentUser, phoneCred).catch(() => {});
        }
      } catch (linkError) {
        console.warn('Could not link credential:', linkError);
      }

      // Save verified phone to Firestore user profile
      const activeUid = auth.currentUser?.uid || user.id;
      if (activeUid) {
        const userRef = doc(db, 'users', activeUid);
        await setDoc(
          userRef,
          {
            phone: fullE164Phone,
            isPhoneVerified: true,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      setStep('verified');
      setTimeout(() => {
        onSuccess(fullE164Phone);
      }, 1000);
    } catch (err: any) {
      console.error('OTP Confirmation error:', err);
      setErrorMessage(err?.message || 'Incorrect 6-digit code. Please verify and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      {/* Invisible reCAPTCHA mount container */}
      <div id="mandatory-recaptcha-container" />

      <div className="bg-[#10141d] text-white border border-amber-500/40 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-scale-up">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent border-b border-amber-500/20 text-center relative">
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="absolute right-4 top-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="Close / Verify Later"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-base font-black text-white">Mobile Verification</h3>
          <p className="text-xs text-gray-300 mt-1 max-w-xs mx-auto">
            {user.name ? `Welcome, ${user.name}! ` : ''}Real SMS verification via Firebase Authentication.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">{errorMessage}</span>
                {errorMessage.includes('Authorized Domains') && (
                  <span className="text-[10px] text-rose-200 block">
                    Tip: Open Firebase Console → Build → Authentication → Settings → Authorized Domains and add this domain.
                  </span>
                )}
              </div>
            </div>
          )}

          {infoMessage && (
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {step === 'phone_input' && (
            <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Your Mobile Number
                </label>
                <div className="flex rounded-2xl bg-black/50 border border-white/10 focus-within:border-amber-400 transition-colors overflow-hidden">
                  {/* Country Code Picker */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCountryPicker((prev) => !prev)}
                      className="h-full px-3 bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-200 flex items-center gap-1.5 border-r border-white/10 cursor-pointer"
                    >
                      <span>{selectedCountry.flag}</span>
                      <span>{selectedCountry.code}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </button>

                    {showCountryPicker && (
                      <div className="absolute top-full left-0 mt-1 w-56 bg-[#161c27] border border-white/15 rounded-2xl shadow-2xl z-50 max-h-52 overflow-y-auto custom-scrollbar">
                        {COUNTRY_CODES.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(c);
                              setShowCountryPicker(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-amber-500/20 flex items-center justify-between text-gray-200 transition-colors cursor-pointer"
                          >
                            <span>
                              {c.flag} {c.name}
                            </span>
                            <span className="font-mono text-gray-400">{c.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder={selectedCountry.format}
                    className="flex-1 px-3 py-3 text-sm text-white placeholder-gray-500 focus:outline-none bg-transparent"
                    autoFocus
                  />
                </div>
              </div>

              {/* Delivery Channel Selector: WhatsApp (Primary) vs Voice Call vs SMS */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-gray-300 font-bold text-[11px]">Delivery Method</label>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Recommended: WhatsApp
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setOtpChannel('whatsapp')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      otpChannel === 'whatsapp'
                        ? 'border-emerald-500 bg-emerald-500/20 ring-1 ring-emerald-500 text-white'
                        : 'border-white/10 bg-black/40 hover:bg-black/60 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        otpChannel === 'whatsapp' ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white'
                      }`}>
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-500/30">Fast</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white leading-tight">WhatsApp</p>
                      <p className="text-[9px] text-gray-400 leading-tight">Instant message</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtpChannel('voice')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      otpChannel === 'voice'
                        ? 'border-amber-400 bg-amber-500/20 ring-1 ring-amber-400 text-white'
                        : 'border-white/10 bg-black/40 hover:bg-black/60 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        otpChannel === 'voice' ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'
                      }`}>
                        <PhoneCall className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white leading-tight">Voice Call</p>
                      <p className="text-[9px] text-gray-400 leading-tight">Automated call</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtpChannel('sms')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      otpChannel === 'sms'
                        ? 'border-orange-500 bg-orange-500/20 ring-1 ring-orange-500 text-white'
                        : 'border-white/10 bg-black/40 hover:bg-black/60 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        otpChannel === 'sms' ? 'bg-orange-500 text-white' : 'bg-white/10 text-white'
                      }`}>
                        <Radio className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white leading-tight">Carrier SMS</p>
                      <p className="text-[9px] text-gray-400 leading-tight">Firebase Auth</p>
                    </div>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !cleanPhone}
                className={`w-full py-3.5 rounded-2xl text-black font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50 ${
                  otpChannel === 'whatsapp'
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 shadow-emerald-500/20'
                    : otpChannel === 'voice'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 shadow-amber-500/20'
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-orange-500/20'
                }`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {otpChannel === 'whatsapp' ? (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        <span>Send OTP via WhatsApp</span>
                      </>
                    ) : otpChannel === 'voice' ? (
                      <>
                        <PhoneCall className="w-4 h-4" />
                        <span>Call Me with OTP</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send SMS Verification Code</span>
                      </>
                    )}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Don't have WhatsApp shortcut */}
              {otpChannel === 'whatsapp' && (
                <div className="text-center pt-0.5">
                  <span className="text-[11px] text-gray-400">Don't have WhatsApp? </span>
                  <button
                    type="button"
                    onClick={() => handleSendOtp('voice')}
                    disabled={loading || !cleanPhone}
                    className="text-[11px] text-amber-400 hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
                  >
                    <PhoneCall className="w-3 h-3" />
                    <span>Get a call for OTP</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {step === 'otp_input' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    lastDispatchedChannel === 'whatsapp'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : lastDispatchedChannel === 'voice'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-orange-500/20 text-orange-400'
                  }`}>
                    {lastDispatchedChannel === 'whatsapp' ? (
                      <MessageSquare className="w-4 h-4" />
                    ) : lastDispatchedChannel === 'voice' ? (
                      <PhoneCall className="w-4 h-4" />
                    ) : (
                      <Radio className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Passcode Sent Via</p>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                        lastDispatchedChannel === 'whatsapp'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          : lastDispatchedChannel === 'voice'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          : 'bg-orange-950 text-orange-300 border border-orange-500/30'
                      }`}>
                        {lastDispatchedChannel === 'whatsapp' ? 'WhatsApp' : lastDispatchedChannel === 'voice' ? 'Voice Call' : 'SMS'}
                      </span>
                    </div>
                    <p className="text-xs font-black text-white tracking-wide">{fullE164Phone}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('phone_input')}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-bold px-2 py-1 rounded-lg bg-white/5 border border-white/10 cursor-pointer transition-colors"
                >
                  Change
                </button>
              </div>

              {/* 6-digit input boxes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 text-center block tracking-widest">
                  Enter 6-Digit Verification Code
                </label>
                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-11 h-13 text-center text-lg font-black bg-black/50 border border-white/15 rounded-xl text-white focus:border-amber-400 focus:bg-amber-500/10 focus:outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={loading || otpDigits.join('').length !== 6}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black text-xs hover:from-amber-400 hover:to-orange-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Confirm OTP</span>
                  </>
                )}
              </button>

              {/* Resend & Alternative Delivery Options */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs px-1 text-gray-400">
                  <span>Didn't receive code?</span>
                  {isTimerRunning ? (
                    <span className="font-mono text-gray-400">
                      Retry in <strong className="text-white font-black">{timerSeconds}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp(lastDispatchedChannel)}
                      disabled={loading}
                      className="text-amber-400 hover:underline font-bold cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Resend Code</span>
                    </button>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-400 font-bold">Try another channel:</span>
                  <div className="flex items-center gap-1.5">
                    {lastDispatchedChannel !== 'whatsapp' && (
                      <button
                        type="button"
                        onClick={() => handleSendOtp('whatsapp')}
                        disabled={loading || (isTimerRunning && timerSeconds > 45)}
                        className="px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-[10px] font-black border border-emerald-500/40 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <MessageSquare className="w-2.5 h-2.5" />
                        <span>WhatsApp</span>
                      </button>
                    )}

                    {lastDispatchedChannel !== 'voice' && (
                      <button
                        type="button"
                        onClick={() => handleSendOtp('voice')}
                        disabled={loading || (isTimerRunning && timerSeconds > 45)}
                        className="px-2 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 text-[10px] font-black border border-amber-500/40 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <PhoneCall className="w-2.5 h-2.5" />
                        <span>Get a Call</span>
                      </button>
                    )}

                    {lastDispatchedChannel !== 'sms' && (
                      <button
                        type="button"
                        onClick={() => handleSendOtp('sms')}
                        disabled={loading || (isTimerRunning && timerSeconds > 45)}
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-gray-200 text-[10px] font-black border border-white/15 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Radio className="w-2.5 h-2.5" />
                        <span>SMS</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'verified' && (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-black text-white">Mobile Number Verified!</h4>
              <p className="text-xs text-gray-400">Connecting your verified profile to Taash Bhatti...</p>
            </div>
          )}

          {/* Diagnostic & Troubleshooting Guide */}
          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowHelpGuide(!showHelpGuide)}
              className="w-full flex items-center justify-between text-[11px] text-gray-400 hover:text-amber-400 transition-colors py-1 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>On Blaze plan but SMS still not delivering?</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHelpGuide ? 'rotate-180' : ''}`} />
            </button>

            {showHelpGuide && (
              <div className="mt-2.5 p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-gray-300 space-y-2.5">
                <div>
                  <strong className="text-amber-400 block mb-1">1. SMS Region Policy (Most Common on Blaze):</strong>
                  <p className="text-gray-300">
                    To prevent SMS pumping scams, Firebase automatically restricts SMS to specific countries on Blaze. In Firebase Console → <strong>Authentication</strong> → <strong>Settings</strong> → <strong>SMS region policy</strong>, verify that <strong>India (+91)</strong> is enabled in the allowed regions list.
                  </p>
                  <a
                    href="https://console.firebase.google.com/project/taash-bhatti/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 underline mt-1"
                  >
                    <span>Open SMS Region Policy</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="pt-1.5 border-t border-white/10">
                  <strong className="text-amber-400 block mb-1">2. Check Real SMS Delivery Logs:</strong>
                  <p className="text-gray-300">
                    Firebase records the exact delivery status of every SMS sent by this project. Check your SMS Usage tab to see if your attempt was marked as <em>"Sent"</em>, <em>"Blocked by region policy"</em>, or <em>"Carrier failed"</em>.
                  </p>
                  <a
                    href="https://console.firebase.google.com/project/taash-bhatti/authentication/usage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 underline mt-1"
                  >
                    <span>Open Firebase SMS Usage Logs</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="pt-1.5 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <strong className="text-amber-400 block">3. Authorized Domains:</strong>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard.writeText(window.location.hostname);
                          setDomainCopied(true);
                          setTimeout(() => setDomainCopied(false), 2000);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 cursor-pointer bg-white/10 px-2 py-0.5 rounded"
                    >
                      {domainCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{domainCopied ? 'Copied!' : 'Copy Current Host'}</span>
                    </button>
                  </div>
                  <p className="text-gray-300 mt-1">
                    Ensure <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">{typeof window !== 'undefined' ? window.location.hostname : 'current domain'}</code> is listed in Firebase Console → <strong>Authentication</strong> → <strong>Settings</strong> → <strong>Authorized domains</strong>.
                  </p>
                </div>

                <div className="pt-1.5 border-t border-white/10">
                  <strong className="text-amber-400 block mb-1">4. TRAI DLT Filtering in India (+91):</strong>
                  <p className="text-gray-300">
                    Indian telcos (Jio, Airtel, Vi) apply strict DLT filtering on foreign SMS gateways. If you need instantaneous authentication without telecom carrier dropouts, add your number under <strong>"Phone numbers for testing"</strong> in Firebase Console.
                  </p>
                  <a
                    href="https://console.firebase.google.com/project/taash-bhatti/authentication/providers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 underline mt-1"
                  >
                    <span>Add Phone number for testing</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer: Sign out or Verify Later */}
        <div className="p-3.5 bg-black/40 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="text-gray-300 hover:text-white font-semibold cursor-pointer"
            >
              Verify Later
            </button>
          ) : (
            <span>Taash Bhatti Secure Auth</span>
          )}

          <button
            type="button"
            onClick={onSignOut}
            className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
