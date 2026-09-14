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
} from 'lucide-react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPhoneNumber,
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
}

export const MandatoryPhoneVerificationModal: React.FC<MandatoryPhoneVerificationModalProps> = ({
  isOpen,
  user,
  onSuccess,
  onSignOut,
}) => {
  const [step, setStep] = useState<'phone_input' | 'otp_input' | 'verified'>('phone_input');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [showCountryPicker, setShowCountryPicker] = useState<boolean>(false);

  // OTP inputs & timer
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  // Clean reCAPTCHA on unmount
  useEffect(() => {
    return () => {
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

  const setupRecaptcha = () => {
    if (typeof window === 'undefined') return null;

    try {
      if ((window as any).mandatoryRecaptchaVerifier) {
        try {
          (window as any).mandatoryRecaptchaVerifier.clear();
        } catch (e) {}
        (window as any).mandatoryRecaptchaVerifier = null;
      }

      const verifier = new RecaptchaVerifier(auth, 'mandatory-recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          setErrorMessage('Verification expired. Please request a new SMS code.');
        },
      });

      (window as any).mandatoryRecaptchaVerifier = verifier;
      return verifier;
    } catch (err: any) {
      console.warn('reCAPTCHA setup warning:', err);
      return null;
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!cleanPhone || cleanPhone.length < selectedCountry.length - 2) {
      setErrorMessage(`Please enter a valid ${selectedCountry.length}-digit mobile phone number.`);
      return;
    }

    setLoading(true);

    try {
      const verifier = setupRecaptcha();
      if (!verifier) {
        throw new Error('reCAPTCHA verification initialization failed.');
      }

      // Firebase Phone Auth SMS dispatch (links to existing Google/Apple/Email account if signed in, or starts phone sign-in)
      let result: ConfirmationResult;
      if (auth.currentUser) {
        try {
          result = await linkWithPhoneNumber(auth.currentUser, fullE164Phone, verifier);
        } catch (linkErr: any) {
          console.warn('linkWithPhoneNumber error, falling back to signInWithPhoneNumber:', linkErr);
          if (linkErr?.code === 'auth/credential-already-in-use') {
            setErrorMessage('This phone number is already linked to another Taash Bhatti account.');
            return;
          }
          if (linkErr?.code === 'auth/provider-already-linked') {
            setStep('verified');
            setTimeout(() => {
              onSuccess(fullE164Phone);
            }, 800);
            return;
          }
          result = await signInWithPhoneNumber(auth, fullE164Phone, verifier);
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

      if (err?.code === 'auth/invalid-phone-number') {
        setErrorMessage('Invalid mobile number format. Please check the digits.');
      } else if (err?.code === 'auth/too-many-requests') {
        setErrorMessage('Too many SMS requests for this number. Please wait a few minutes.');
      } else if (err?.code === 'auth/quota-exceeded') {
        setErrorMessage('Daily SMS quota reached on this network. Please try again shortly.');
      } else {
        setErrorMessage(err?.message || 'Failed to dispatch SMS. Please check your connection.');
      }
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
      setErrorMessage('Please enter all 6 digits of the SMS code.');
      return;
    }

    setLoading(true);

    try {
      if (!confirmationResult) {
        throw new Error('Verification session expired. Please request a new SMS code.');
      }

      await confirmationResult.confirm(code);

      // Successfully confirmed! Save verified phone to Firestore user profile
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
      }, 1200);
    } catch (err: any) {
      console.warn('OTP Confirmation error:', err);
      if (err?.code === 'auth/invalid-verification-code') {
        setErrorMessage('Incorrect 6-digit code. Please verify the SMS and try again.');
      } else if (err?.code === 'auth/code-expired') {
        setErrorMessage('This code has expired. Please request a new code.');
      } else {
        setErrorMessage(err?.message || 'Verification failed. Please check the code.');
      }
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-base font-black text-white">Mobile Verification Required</h3>
          <p className="text-xs text-gray-300 mt-1 max-w-xs mx-auto">
            {user.name ? `Welcome, ${user.name}! ` : ''}A verified mobile number is mandatory for order dispatch, live tracking & rider coordination.
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

          {step === 'phone_input' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
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
                    <span>Send SMS Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'otp_input' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-gray-300">
                  Enter the 6-digit code sent to <span className="font-bold text-white">{fullE164Phone}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setStep('phone_input')}
                  className="text-[11px] text-amber-400 hover:underline mt-1 cursor-pointer"
                >
                  Change mobile number
                </button>
              </div>

              {/* 6-digit input boxes */}
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
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="text-amber-400 hover:underline font-bold cursor-pointer"
                  >
                    Resend SMS Code Now
                  </button>
                )}
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
