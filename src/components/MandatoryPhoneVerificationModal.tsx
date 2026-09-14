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
  Zap,
} from 'lucide-react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { User } from '../types';

interface MandatoryPhoneVerificationModalProps {
  isOpen: boolean;
  user: User;
  onSuccess: (verifiedPhone: string, atp?: string) => void;
  onSignOut: () => void;
}

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

export const MandatoryPhoneVerificationModal: React.FC<MandatoryPhoneVerificationModalProps> = ({
  isOpen,
  user,
  onSuccess,
  onSignOut,
}) => {
  // Step flow:
  // 'phone_input' -> ('atp_input' for registered accounts OR 'otp_input' for first-time) -> 'verifying' -> 'verified'
  const [step, setStep] = useState<'phone_input' | 'atp_input' | 'otp_input' | 'verifying' | 'verified'>('phone_input');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [showCountryPicker, setShowCountryPicker] = useState<boolean>(false);

  // Registered account All-Time Password (ATP) state
  const [registeredAtp, setRegisteredAtp] = useState<string | null>(null);
  const [atpDigits, setAtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const atpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Real cellular SMS OTP states
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Status states
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

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

  const cleanupRecaptcha = () => {
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
    const container = document.getElementById('mandatory-recaptcha-container');
    if (container) {
      container.innerHTML = '';
    }
  };

  // Clean reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      cleanupRecaptcha();
    };
  }, []);

  if (!isOpen) return null;

  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const fullE164Phone = `${selectedCountry.code}${cleanPhone}`;

  const getOrCreateRecaptchaVerifier = () => {
    if (typeof window === 'undefined') return null;

    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }

    const container = document.getElementById('mandatory-recaptcha-container');
    if (container) {
      container.innerHTML = '';
    }

    try {
      const verifier = new RecaptchaVerifier(auth, 'mandatory-recaptcha-container', {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => {
          cleanupRecaptcha();
          setErrorMessage('Verification session expired. Please tap Resend SMS Code.');
        },
      });

      recaptchaVerifierRef.current = verifier;
      (window as any).mandatoryRecaptchaVerifier = verifier;
      return verifier;
    } catch (err: any) {
      console.warn('reCAPTCHA setup error, resetting container:', err);
      if (container) {
        container.innerHTML = '';
      }
      try {
        const verifier = new RecaptchaVerifier(auth, 'mandatory-recaptcha-container', {
          size: 'invisible',
          callback: () => {},
        });
        recaptchaVerifierRef.current = verifier;
        (window as any).mandatoryRecaptchaVerifier = verifier;
        return verifier;
      } catch (e2) {
        console.error('Secondary reCAPTCHA setup failed:', e2);
        return null;
      }
    }
  };

  // Dispatch real cellular SMS OTP via Firebase Phone Auth
  const dispatchRealSmsOtp = async () => {
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const verifier = getOrCreateRecaptchaVerifier();
      if (!verifier) {
        throw new Error('Verification setup failed. Please try again.');
      }

      let result: ConfirmationResult;
      if (auth.currentUser) {
        try {
          result = await linkWithPhoneNumber(auth.currentUser, fullE164Phone, verifier);
        } catch (linkErr: any) {
          console.warn('linkWithPhoneNumber note:', linkErr?.code);
          if (linkErr?.code === 'auth/credential-already-in-use') {
            setErrorMessage('This mobile number is already linked to an existing account. First-come, first-served.');
            setLoading(false);
            return;
          }
          if (linkErr?.code === 'auth/provider-already-linked') {
            setStep('verifying');
            await new Promise((r) => setTimeout(r, 1200));
            setStep('verified');
            onSuccess(fullE164Phone, user.atp);
            return;
          }
          cleanupRecaptcha();
          const retryVerifier = getOrCreateRecaptchaVerifier();
          if (!retryVerifier) throw new Error('Verification setup failed.');
          result = await signInWithPhoneNumber(auth, fullE164Phone, retryVerifier);
        }
      } else {
        result = await signInWithPhoneNumber(auth, fullE164Phone, verifier);
      }

      setConfirmationResult(result);
      setStep('otp_input');
      setTimerSeconds(60);
      setIsTimerRunning(true);
      setInfoMessage(`6-digit verification code sent via SMS to ${fullE164Phone}`);

      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    } catch (err: any) {
      console.warn('Firebase Phone Auth error:', err?.code, err?.message);
      cleanupRecaptcha();

      if (err?.code === 'auth/invalid-phone-number') {
        setErrorMessage('Invalid mobile number format. Please check the digits.');
      } else if (err?.code === 'auth/too-many-requests') {
        setErrorMessage('Too many SMS requests for this number. Please wait a few minutes.');
      } else if (err?.code === 'auth/quota-exceeded') {
        setErrorMessage('Daily SMS quota reached on this network. Please try again shortly.');
      } else if (err?.code === 'auth/invalid-app-credential' || err?.message?.includes('invalid-app-credential')) {
        setErrorMessage('Device verification failed. Please check network connection and try again.');
      } else if (err?.code === 'auth/captcha-check-failed') {
        setErrorMessage('Security check failed. Please tap Resend SMS Code to try again.');
      } else {
        setErrorMessage(err?.message || 'Failed to dispatch SMS. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Check Phone: First-come first-served check & Route to ATP (Registered) vs real SMS OTP (First-time)
  const handleCheckPhone = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!cleanPhone || cleanPhone.length < selectedCountry.length - 2) {
      setErrorMessage(`Please enter a valid ${selectedCountry.length}-digit mobile phone number.`);
      return;
    }

    setLoading(true);

    try {
      const currentUid = auth.currentUser?.uid || user.id;

      // 1. First-come, first-served check: Verify if another account already owns this phone
      const qPhone = query(collection(db, 'users'), where('phone', '==', fullE164Phone));
      const snapPhone = await getDocs(qPhone).catch(() => null);

      let existingAccountWithPhone: { id: string; data: User } | null = null;

      if (snapPhone && !snapPhone.empty) {
        for (const d of snapPhone.docs) {
          if (d.id !== currentUid) {
            // Already owned by another registered user! First-come, first-served
            setErrorMessage('This mobile number is already linked to an existing account. First-come, first-served. Please sign in with that account.');
            setLoading(false);
            return;
          }
          existingAccountWithPhone = { id: d.id, data: d.data() as User };
        }
      }

      // 2. Check if this is a REGISTERED account with an existing All-Time Password (ATP)
      const knownAtp = user.atp || existingAccountWithPhone?.data?.atp;
      if (knownAtp && knownAtp.trim().length === 6) {
        // Registered account with ATP! Allow instant ATP entry with option to request SMS code
        setRegisteredAtp(knownAtp.trim());
        setStep('atp_input');
        setAtpDigits(['', '', '', '', '', '']);
        setInfoMessage('Welcome back! Enter your 6-digit All-Time Password (ATP) or request an SMS OTP.');
        setLoading(false);
        setTimeout(() => {
          atpInputRefs.current[0]?.focus();
        }, 300);
        return;
      }

      // 3. FIRST-TIME account (no ATP yet): Strictly real cellular SMS OTP
      await dispatchRealSmsOtp();
    } catch (err: any) {
      console.warn('Phone check note:', err);
      // Fallback to real SMS OTP
      await dispatchRealSmsOtp();
    }
  };

  // ATP Input Digits Handler
  const handleAtpDigitChange = (index: number, value: string) => {
    const cleanChar = value.replace(/\D/g, '');
    const newDigits = [...atpDigits];

    if (cleanChar.length > 0) {
      newDigits[index] = cleanChar[cleanChar.length - 1];
      setAtpDigits(newDigits);

      if (index < 5) {
        atpInputRefs.current[index + 1]?.focus();
      } else {
        const fullCode = newDigits.join('');
        if (fullCode.length === 6) {
          handleVerifyAtp(fullCode);
        }
      }
    } else {
      newDigits[index] = '';
      setAtpDigits(newDigits);
    }
  };

  const handleAtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!atpDigits[index] && index > 0) {
        atpInputRefs.current[index - 1]?.focus();
        const newDigits = [...atpDigits];
        newDigits[index - 1] = '';
        setAtpDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      atpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      atpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleAtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    if (pastedData.length >= 6) {
      const pasteDigits = pastedData.slice(0, 6).split('');
      setAtpDigits(pasteDigits);
      atpInputRefs.current[5]?.focus();
      handleVerifyAtp(pasteDigits.join(''));
    }
  };

  // Verify ATP code
  const handleVerifyAtp = async (codeToVerify?: string) => {
    const code = codeToVerify || atpDigits.join('');
    setErrorMessage(null);

    if (code.length !== 6) {
      setErrorMessage('Please enter all 6 digits of your All-Time Password (ATP).');
      return;
    }

    if (!registeredAtp || code !== registeredAtp) {
      setErrorMessage('Incorrect All-Time Password (ATP). Please check or request an SMS OTP.');
      return;
    }

    setLoading(true);
    setStep('verifying');

    try {
      const activeUid = auth.currentUser?.uid || user.id;
      if (activeUid) {
        const userRef = doc(db, 'users', activeUid);
        await setDoc(
          userRef,
          {
            phone: fullE164Phone,
            isPhoneVerified: true,
            atp: registeredAtp,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      // Plain logo verifying animation duration (1.2s)
      await new Promise((r) => setTimeout(r, 1200));

      onSuccess(fullE164Phone, registeredAtp);
    } catch (err: any) {
      console.warn('ATP confirmation error:', err);
      setStep('atp_input');
      setErrorMessage(err?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // OTP Input Digits Handler
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

  // Verify Real SMS OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    setErrorMessage(null);

    if (code.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the SMS verification code.');
      return;
    }

    if (!confirmationResult) {
      setErrorMessage('Verification session expired. Please request a new SMS code.');
      return;
    }

    setLoading(true);
    setStep('verifying');

    try {
      // Strictly real Firebase confirmation via cellular telecom OTP
      await confirmationResult.confirm(code);

      // Successfully confirmed! First-time accounts receive a generated 6-digit All-Time Password (ATP)
      const activeUid = auth.currentUser?.uid || user.id;
      const atpCode = user.atp || Math.floor(100000 + Math.random() * 900000).toString();
      if (activeUid) {
        const userRef = doc(db, 'users', activeUid);
        await setDoc(
          userRef,
          {
            phone: fullE164Phone,
            isPhoneVerified: true,
            atp: atpCode,
            atpUpdatedAt: user.atpUpdatedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      // Plain logo verifying animation duration (1.2s)
      await new Promise((r) => setTimeout(r, 1200));

      onSuccess(fullE164Phone, atpCode);
    } catch (err: any) {
      console.warn('OTP Confirmation error:', err);
      setStep('otp_input');
      if (err?.code === 'auth/invalid-verification-code') {
        setErrorMessage('Incorrect 6-digit SMS code. Please verify your message and try again.');
      } else if (err?.code === 'auth/code-expired') {
        setErrorMessage('This verification code has expired. Please request a new code.');
      } else {
        setErrorMessage(err?.message || 'Verification failed. Please check the code and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // PLAIN FULL-SCREEN VERIFYING VIEW (Zero buttons, logo focused)
  if (step === 'verifying') {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-6 bg-[#070A0D] select-none animate-fade-in">
        <div className="relative flex items-center justify-center mb-6">
          {/* Outer Golden Spinner Ring */}
          <span
            className="absolute -inset-5 rounded-full border-2 border-amber-400/40 border-t-amber-400 animate-spin pointer-events-none"
            style={{ animationDuration: '1.8s' }}
          />
          <span className="absolute -inset-2.5 rounded-full border border-orange-500/30 animate-pulse pointer-events-none" />

          {/* Taash Bhatti Logo Badge */}
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#1c222e] to-[#0d1117] border border-amber-500/40 p-3.5 flex items-center justify-center shadow-[0_0_35px_rgba(245,158,11,0.25)]">
            <img
              src="https://cdn.postimage.me/2026/08/01/28172.png"
              alt="Taash Bhatti"
              className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(245,158,11,0.5)] animate-pulse"
            />
          </div>
        </div>

        <div className="space-y-1.5 text-center">
          <h4 className="text-xl font-black text-white tracking-wide">Verifying.....</h4>
          <p className="text-xs text-amber-400/90 font-medium tracking-wide">Taash Bhatti Artisanal Kitchen</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      {/* Invisible reCAPTCHA mount container */}
      <div id="mandatory-recaptcha-container" />

      <div className="bg-[#10141d] text-white border border-amber-500/40 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-scale-up">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent border-b border-amber-500/20 text-center relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-base font-black text-white">Mobile Verification Required</h3>
          <p className="text-xs text-gray-300 mt-1 max-w-xs mx-auto">
            {user.name ? `Welcome, ${user.name}! ` : ''}A verified mobile number is required for order dispatch, live tracking & rider coordination.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {infoMessage && (
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* STEP 1: PHONE INPUT */}
          {step === 'phone_input' && (
            <form onSubmit={handleCheckPhone} className="space-y-4">
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
                            className="w-full px-3 py-2 text-left text-xs hover:bg-amber-500/20 flex items-center justify-between text-gray-200 transition-colors"
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

              <button
                type="submit"
                disabled={loading || !cleanPhone}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black text-xs hover:from-amber-400 hover:to-orange-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify Mobile Number</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2A: REGISTERED ACCOUNT ATP INPUT */}
          {step === 'atp_input' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-2">
                  <Zap className="w-3 h-3" />
                  <span>All-Time Password (ATP)</span>
                </div>
                <p className="text-xs text-gray-300">
                  Enter the 6-digit ATP for <span className="font-bold text-white">{fullE164Phone}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setStep('phone_input')}
                  className="text-[11px] text-amber-400 hover:underline mt-1 cursor-pointer"
                >
                  Change mobile number
                </button>
              </div>

              {/* 6-digit ATP input boxes */}
              <div className="flex justify-center gap-2" onPaste={handleAtpPaste}>
                {atpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      atpInputRefs.current[index] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleAtpDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleAtpKeyDown(index, e)}
                    className="w-11 h-13 text-center text-lg font-black bg-black/50 border border-amber-500/30 rounded-xl text-amber-300 focus:border-amber-400 focus:bg-amber-500/10 focus:outline-none transition-all"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleVerifyAtp()}
                disabled={loading || atpDigits.join('').length !== 6}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black text-xs hover:from-amber-400 hover:to-orange-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Verify with ATP</span>
                  </>
                )}
              </button>

              {/* Alternative: Request real SMS OTP */}
              <div className="text-center pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => dispatchRealSmsOtp()}
                  disabled={loading}
                  className="text-xs text-amber-400/90 hover:text-amber-300 font-bold hover:underline cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Don&apos;t know your ATP? Verify with SMS OTP</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2B: FIRST-TIME ACCOUNT STRICT SMS OTP */}
          {step === 'otp_input' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-gray-300">
                  Enter the 6-digit code sent via SMS to <span className="font-bold text-white">{fullE164Phone}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setStep('phone_input')}
                  className="text-[11px] text-amber-400 hover:underline mt-1 cursor-pointer"
                >
                  Change mobile number
                </button>
              </div>

              {/* 6-digit OTP input boxes */}
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
                    <span>Verify & Continue</span>
                  </>
                )}
              </button>

              {/* Resend SMS Timer */}
              <div className="text-center text-xs text-gray-400">
                {isTimerRunning ? (
                  <span>Resend SMS code in {timerSeconds}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => dispatchRealSmsOtp()}
                    disabled={loading}
                    className="text-amber-400 hover:underline font-bold cursor-pointer"
                  >
                    Resend SMS Code Now
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Sign out alternative */}
        <div className="p-3.5 bg-black/40 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
          <span>Wrong account?</span>
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
