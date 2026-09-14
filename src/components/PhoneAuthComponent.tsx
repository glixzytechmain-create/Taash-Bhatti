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
  Edit3, 
  AlertCircle, 
  Sparkles, 
  Lock,
  ChevronDown,
  Info,
  MapPin,
  ExternalLink,
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
  ConfirmationResult,
  signInAnonymously,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
  { code: '+971', name: 'United Arab Emirates', flag: '🇦🇪', format: '50 123 4567', length: 9 },
  { code: '+65', name: 'Singapore', flag: '🇸🇬', format: '8123 4567', length: 8 },
  { code: '+61', name: 'Australia', flag: '🇦🇺', format: '412 345 678', length: 9 },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦', format: '50 123 4567', length: 9 },
  { code: '+49', name: 'Germany', flag: '🇩🇪', format: '151 12345678', length: 10 },
];

interface PhoneAuthComponentProps {
  onSuccess: (userData: { user: User; fbUser: any; isNewUser: boolean }) => void;
  onCancel?: () => void;
  defaultName?: string;
}

export default function PhoneAuthComponent({
  onSuccess,
  onCancel,
  defaultName = '',
}: PhoneAuthComponentProps) {
  // Steps: 'phone_input' | 'otp_input' | 'checking_address' | 'verified'
  const [step, setStep] = useState<'phone_input' | 'otp_input' | 'checking_address' | 'verified'>('phone_input');
  const [addressCheckStatus, setAddressCheckStatus] = useState<string>('Verifying saved delivery addresses...');

  // Input states
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState(defaultName);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // OTP states
  const [otpChannel, setOtpChannel] = useState<'whatsapp' | 'voice' | 'sms'>('whatsapp');
  const [lastDispatchedChannel, setLastDispatchedChannel] = useState<'whatsapp' | 'voice' | 'sms'>('whatsapp');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpSessionId, setOtpSessionId] = useState<string | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState<boolean>(false);

  // Status & Error states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [domainCopied, setDomainCopied] = useState<boolean>(false);

  // Input refs for 6 OTP boxes
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {}
        recaptchaVerifierRef.current = null;
      }
      if (typeof window !== 'undefined' && (window as any).phoneRecaptchaVerifier) {
        try {
          (window as any).phoneRecaptchaVerifier.clear();
        } catch (e) {}
        (window as any).phoneRecaptchaVerifier = null;
      }
    };
  }, []);

  // Timer countdown effect
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

  // Clean raw phone string
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const fullE164Phone = `${selectedCountry.code}${cleanPhone}`;

  // Helper: Initialize Invisible Recaptcha Verifier
  const setupRecaptcha = (): RecaptchaVerifier | null => {
    if (typeof window === 'undefined') return null;

    try {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {}
        recaptchaVerifierRef.current = null;
      }

      if ((window as any).phoneRecaptchaVerifier) {
        try {
          (window as any).phoneRecaptchaVerifier.clear();
        } catch (e) {}
        (window as any).phoneRecaptchaVerifier = null;
      }

      const container = document.getElementById('phone-recaptcha-container');
      if (container) {
        container.innerHTML = '';
      }

      const verifier = new RecaptchaVerifier(auth, 'phone-recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          setErrorMessage("reCAPTCHA verification expired. Please request a new code.");
        }
      });

      recaptchaVerifierRef.current = verifier;
      (window as any).phoneRecaptchaVerifier = verifier;
      return verifier;
    } catch (err: any) {
      console.warn("Recaptcha initialization warning:", err);
      return null;
    }
  };

  // 1. Send OTP Request Handler
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

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (fullName.trim().length < 2) {
      setErrorMessage("Please enter a valid full name (at least 2 characters).");
      return;
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
        console.warn('2Factor OTP route response:', data);
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
        throw new Error(data.error || 'Failed to dispatch OTP code.');
      }
    } catch (err: any) {
      console.error("OTP send error:", err);
      setErrorMessage(err?.message || "Failed to send verification code. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  };

  // 2. OTP Inputs Handlers
  const handleOtpDigitChange = (index: number, value: string) => {
    const cleanChar = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    // Handle single digit input
    if (cleanChar.length > 0) {
      newDigits[index] = cleanChar[cleanChar.length - 1];
      setOtpDigits(newDigits);

      // Auto-advance to next box if not on the last box
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      } else {
        // If all 6 digits entered, automatically verify!
        const fullOtp = newDigits.join('');
        if (fullOtp.length === 6) {
          handleVerifyOtp(fullOtp);
        }
      }
    } else {
      // Empty / Backspace in current box
      newDigits[index] = '';
      setOtpDigits(newDigits);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // Move focus backward on backspace if current is already empty
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

  // 3. Verify OTP & Finalize Session
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    setErrorMessage(null);

    if (code.length !== 6) {
      setErrorMessage("Please enter all 6 digits of the verification code.");
      return;
    }

    setLoading(true);

    try {
      let resolvedUid = '';
      let resolvedEmail = '';
      let resolvedFirebaseUser: any = null;

      if (otpSessionId) {
        // Verify with 2Factor.in High-Speed Gateway
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
          throw new Error(data.error || 'Incorrect OTP code entered. Please check and try again.');
        }

        resolvedUid = auth.currentUser?.uid || `phone_${cleanPhone}`;
        resolvedEmail = auth.currentUser?.email || '';
        resolvedFirebaseUser = auth.currentUser || {
          uid: resolvedUid,
          email: resolvedEmail,
          phoneNumber: fullE164Phone,
          displayName: fullName.trim(),
        };
      } else if (confirmationResult) {
        // Real Firebase confirmation
        const cred = await confirmationResult.confirm(code);
        resolvedFirebaseUser = cred.user;
        resolvedUid = resolvedFirebaseUser.uid;
        resolvedEmail = resolvedFirebaseUser.email || '';
      } else {
        throw new Error("Session expired. Please request a new verification code.");
      }

      let isNew = false;

      // Step transition to checking saved addresses & user profile
      setStep('checking_address');
      setAddressCheckStatus('Checking your saved delivery addresses & account...');

      // Check or create Firestore User document
      const uid = resolvedUid;
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef).catch(() => null);

      let finalProfile: User;

      if (userSnap && userSnap.exists()) {
        const existingData = userSnap.data() as User;
        const cleanExistingEmail = existingData.email?.includes('@taashbhatti.phone') ? '' : (existingData.email || resolvedEmail || '');
        finalProfile = {
          ...existingData,
          phone: fullE164Phone,
          name: fullName.trim() || existingData.name || `Customer ${cleanPhone.slice(-4)}`,
          email: cleanExistingEmail,
          isPhoneVerified: true,
        };
        // Check saved addresses count
        const savedList = (existingData.savedAddresses || []).filter(a => typeof a === 'string' && a.trim().length > 0);
        const primaryAddr = (existingData.address && existingData.address.trim().length > 0) ? [existingData.address.trim()] : [];
        const uniqueAddresses = Array.from(new Set([...savedList, ...primaryAddr]));
        if (uniqueAddresses.length > 0) {
          setAddressCheckStatus(`✓ Found ${uniqueAddresses.length} saved doorstep address(es)! Synchronizing...`);
        } else {
          setAddressCheckStatus('Profile confirmed. No saved addresses found.');
        }
        // Update user record with phone and clean email
        await setDoc(userRef, { phone: fullE164Phone, email: cleanExistingEmail, isPhoneVerified: true }, { merge: true }).catch(() => {});
      } else {
        isNew = true;
        setAddressCheckStatus('New account created. Setting up your profile...');
        finalProfile = {
          id: uid,
          name: fullName.trim() || `Customer ${cleanPhone.slice(-4)}`,
          email: resolvedEmail || '',
          phone: fullE164Phone,
          isPhoneVerified: true,
          preferredDietaryType: 'all',
          address: '',
          savedAddresses: [],
          savedPayments: [],
          deckMealIds: [],
          favoriteMealIds: [],
          goal: 'general',
          onboardingCompleted: true,
          createdAt: new Date().toISOString(),
          walletBalance: 100,
          goldenEmberBalance: 100,
          standardEmberBalance: 0,
        };
        await setDoc(userRef, { ...finalProfile, authProvider: 'phone' }).catch((err) => console.warn("User doc creation note:", err));
      }

      // Update Firebase Auth Display Name if provided
      if (auth.currentUser && fullName.trim()) {
        try {
          await updateProfile(auth.currentUser, { displayName: fullName.trim() });
        } catch (e) {}
      }

      // Cache session locally
      try {
        localStorage.setItem('fitzaika_cached_user_profile', JSON.stringify(finalProfile));
        localStorage.setItem('fitzaika_cached_fb_user', JSON.stringify({
          uid: resolvedUid,
          email: resolvedEmail || '',
          phoneNumber: fullE164Phone,
          displayName: finalProfile.name,
        }));
      } catch (e) {}

      // Short delay so user sees address verification status
      await new Promise(r => setTimeout(r, 600));

      setStep('verified');
      setTimeout(() => {
        onSuccess({
          user: finalProfile,
          fbUser: resolvedFirebaseUser,
          isNewUser: isNew,
        });
      }, 700);

    } catch (err: any) {
      console.error("OTP verification error:", err);
      if (err?.code === 'auth/invalid-verification-code') {
        setErrorMessage("Incorrect verification code. Please check and try again.");
      } else if (err?.code === 'auth/code-expired') {
        setErrorMessage("Verification code has expired. Please tap 'Resend OTP'.");
      } else {
        setErrorMessage(err?.message || "Failed to verify code. Please verify the code and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4 font-sans">
      {/* Hidden reCAPTCHA anchor */}
      <div id="phone-recaptcha-container" className="my-1 flex justify-center overflow-hidden" />

      {/* STEP 1: PHONE NUMBER & CREDENTIALS INPUT */}
      {step === 'phone_input' && (
        <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-3.5">
          <div className="bg-brand-green/5 border border-brand-green/10 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-brand-charcoal">
            <div className="w-8 h-8 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-brand-charcoal">Instant SMS Login</p>
              <p className="text-[10px] text-brand-charcoal/60">Receive a secure 6-digit one-time passcode to sign in instantly.</p>
            </div>
          </div>

          {/* Full Name (Mandatory) */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-brand-charcoal/70 block tracking-wide">
              Full Name <span className="text-brand-orange">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rohan Varma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-brand-cream/15 border border-brand-green/15 rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            />
          </div>

          {/* Mobile Phone Number with Country Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-brand-charcoal/50 block tracking-wide">
              Mobile Phone Number <span className="text-brand-orange">*</span>
            </label>
            <div className="flex items-center gap-2">
              {/* Country Code Dropdown Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                  className="h-11 px-2.5 bg-brand-cream/20 hover:bg-brand-cream/40 border border-brand-green/15 rounded-xl text-xs font-bold text-brand-charcoal flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <span className="text-sm">{selectedCountry.flag}</span>
                  <span>{selectedCountry.code}</span>
                  <ChevronDown className="w-3 h-3 text-brand-charcoal/40" />
                </button>

                {/* Country List Dropdown Menu */}
                {showCountryPicker && (
                  <div className="absolute top-12 left-0 z-30 w-56 max-h-56 overflow-y-auto bg-white border border-brand-green/15 rounded-2xl shadow-xl p-1.5 space-y-1">
                    {COUNTRY_CODES.map((c) => (
                      <button
                        key={c.code + c.name}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c);
                          setShowCountryPicker(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-brand-cream/40 transition-colors ${
                          selectedCountry.code === c.code && selectedCountry.name === c.name ? 'bg-brand-green/10 text-brand-green' : 'text-brand-charcoal'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{c.flag}</span>
                          <span className="truncate max-w-[120px]">{c.name}</span>
                        </span>
                        <span className="text-[11px] font-mono text-brand-charcoal/60">{c.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Digits Input */}
              <div className="relative flex-1">
                <input
                  type="tel"
                  required
                  autoFocus
                  placeholder={selectedCountry.format}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full h-11 bg-brand-cream/15 border border-brand-green/15 rounded-xl px-3.5 text-xs font-bold tracking-wider text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                />
                {cleanPhone && (
                  <span className="absolute right-3 top-3 text-[10px] font-mono text-brand-charcoal/40">
                    {cleanPhone.length}/{selectedCountry.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Channel Selection: WhatsApp (Primary) vs Voice Call vs SMS */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-brand-charcoal flex items-center justify-between">
              <span>Delivery Method</span>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Recommended: WhatsApp
              </span>
            </label>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOtpChannel('whatsapp')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  otpChannel === 'whatsapp'
                    ? 'border-emerald-600 bg-emerald-500/10 ring-1 ring-emerald-600'
                    : 'border-brand-green/15 bg-brand-cream/15 hover:bg-brand-cream/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    otpChannel === 'whatsapp' ? 'bg-emerald-600 text-white' : 'bg-brand-charcoal/10 text-brand-charcoal'
                  }`}>
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded">Fast</span>
                </div>
                <div>
                  <p className="text-[11px] font-black text-brand-charcoal leading-tight">WhatsApp</p>
                  <p className="text-[9px] text-brand-charcoal/60 leading-tight">Instant message</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOtpChannel('voice')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  otpChannel === 'voice'
                    ? 'border-brand-orange bg-amber-500/10 ring-1 ring-brand-orange'
                    : 'border-brand-green/15 bg-brand-cream/15 hover:bg-brand-cream/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    otpChannel === 'voice' ? 'bg-brand-orange text-white' : 'bg-brand-charcoal/10 text-brand-charcoal'
                  }`}>
                    <PhoneCall className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-black text-brand-charcoal leading-tight">Voice Call</p>
                  <p className="text-[9px] text-brand-charcoal/60 leading-tight">Automated call</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOtpChannel('sms')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  otpChannel === 'sms'
                    ? 'border-brand-green bg-brand-green/10 ring-1 ring-brand-green'
                    : 'border-brand-green/15 bg-brand-cream/15 hover:bg-brand-cream/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    otpChannel === 'sms' ? 'bg-brand-green text-white' : 'bg-brand-charcoal/10 text-brand-charcoal'
                  }`}>
                    <Radio className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-black text-brand-charcoal leading-tight">Carrier SMS</p>
                  <p className="text-[9px] text-brand-charcoal/60 leading-tight">Firebase Auth</p>
                </div>
              </button>
            </div>

            {/* Quick helper note */}
            <p className="text-[10px] text-brand-charcoal/60 pt-0.5">
              {otpChannel === 'whatsapp' ? (
                <span>WhatsApp OTP will be delivered directly to your WhatsApp chat in 2-5 seconds.</span>
              ) : otpChannel === 'voice' ? (
                <span>You'll receive an automated voice phone call that speaks out your 6-digit OTP code clearly.</span>
              ) : (
                <span>Standard carrier SMS delivered directly via Firebase Authentication.</span>
              )}
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200/50 text-red-600 text-[11px] font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Button: Send Verification Code */}
          <button
            type="submit"
            disabled={loading || !cleanPhone || !fullName.trim()}
            className={`w-full text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
              otpChannel === 'whatsapp' 
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                : otpChannel === 'voice' 
                ? 'bg-brand-orange hover:bg-brand-orange/90 shadow-brand-orange/20' 
                : 'bg-brand-green hover:bg-brand-green/95 shadow-brand-green/20'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>
                  {otpChannel === 'voice' ? 'Initiating Voice Call...' : 'Requesting Secure OTP...'}
                </span>
              </>
            ) : (
              <>
                {otpChannel === 'whatsapp' ? (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    <span>SEND OTP VIA WHATSAPP</span>
                  </>
                ) : otpChannel === 'voice' ? (
                  <>
                    <PhoneCall className="w-4 h-4" />
                    <span>CALL ME WITH OTP</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>SEND OTP VIA SMS</span>
                  </>
                )}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Don't have WhatsApp shortcut */}
          {otpChannel === 'whatsapp' && (
            <div className="text-center pt-1">
              <span className="text-[11px] text-brand-charcoal/60">Don't have WhatsApp? </span>
              <button
                type="button"
                onClick={() => handleSendOtp('voice')}
                disabled={loading || !cleanPhone || !fullName.trim()}
                className="text-[11px] text-brand-orange hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
              >
                <PhoneCall className="w-3 h-3" />
                <span>Get a call for OTP</span>
              </button>
            </div>
          )}

          {/* Security Assurance Tag */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-brand-charcoal/50 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-green" />
            <span>End-to-End Encrypted SMS Verification</span>
          </div>
        </form>
      )}

      {/* STEP 2: 6-DIGIT OTP VERIFICATION */}
      {step === 'otp_input' && (
        <div className="space-y-4 animate-fade-in">
          {/* Header with Phone, Channel Badge & Change Button */}
          <div className="bg-brand-cream/25 border border-brand-green/10 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                lastDispatchedChannel === 'whatsapp' 
                  ? 'bg-emerald-500/15 text-emerald-600' 
                  : lastDispatchedChannel === 'voice' 
                  ? 'bg-amber-500/15 text-amber-600' 
                  : 'bg-brand-green/15 text-brand-green'
              }`}>
                {lastDispatchedChannel === 'whatsapp' ? (
                  <MessageSquare className="w-4 h-4" />
                ) : lastDispatchedChannel === 'voice' ? (
                  <PhoneCall className="w-4 h-4" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] uppercase font-black text-brand-charcoal/50 tracking-wider">Passcode Sent Via</p>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                    lastDispatchedChannel === 'whatsapp'
                      ? 'bg-emerald-100 text-emerald-700'
                      : lastDispatchedChannel === 'voice'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-brand-green/10 text-brand-green'
                  }`}>
                    {lastDispatchedChannel === 'whatsapp' ? 'WhatsApp' : lastDispatchedChannel === 'voice' ? 'Voice Call' : 'SMS'}
                  </span>
                </div>
                <p className="text-xs font-black text-brand-charcoal tracking-wide">{fullE164Phone}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('phone_input');
                setErrorMessage(null);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white text-brand-charcoal hover:text-brand-green border border-brand-green/15 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Edit3 className="w-3 h-3" />
              <span>Change</span>
            </button>
          </div>

          {/* 6 Individual Digit Input Boxes */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-brand-charcoal/50 text-center block tracking-widest">
              Enter 6-Digit OTP
            </label>
            <div className="flex justify-center items-center gap-2 sm:gap-2.5">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  className={`w-10 h-13 sm:w-11 sm:h-14 text-center text-xl font-mono font-black rounded-xl border transition-all focus:outline-none ${
                    digit 
                      ? 'border-brand-green bg-brand-green/5 text-brand-charcoal shadow-xs' 
                      : 'border-brand-green/20 bg-brand-cream/15 text-brand-charcoal focus:border-brand-green focus:ring-2 focus:ring-brand-green/20'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Error Display */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200/50 text-red-600 text-[11px] font-bold flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Verify Button */}
          <button
            type="button"
            onClick={() => handleVerifyOtp()}
            disabled={loading || otpDigits.join('').length !== 6}
            className="w-full bg-brand-green hover:bg-brand-green/95 text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying Passcode...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>VERIFY OTP & LOG IN</span>
              </>
            )}
          </button>

          {/* Resend & Alternative Delivery Channel Controls */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-brand-charcoal/50 text-[11px]">
                Didn't receive code?
              </span>
              {isTimerRunning ? (
                <span className="text-brand-charcoal/60 font-mono text-[11px]">
                  Retry in <strong className="text-brand-charcoal font-black">{timerSeconds}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendOtp(lastDispatchedChannel)}
                  disabled={loading}
                  className="text-brand-orange hover:text-brand-orange/80 font-black text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Resend Code</span>
                </button>
              )}
            </div>

            {/* Alternative Delivery Options: WhatsApp vs Voice Call vs SMS */}
            <div className="p-2.5 rounded-xl bg-brand-cream/30 border border-brand-green/10 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-brand-charcoal/60">Try another channel:</span>
              <div className="flex items-center gap-1.5">
                {lastDispatchedChannel !== 'whatsapp' && (
                  <button
                    type="button"
                    onClick={() => handleSendOtp('whatsapp')}
                    disabled={loading || (isTimerRunning && timerSeconds > 45)}
                    className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
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
                    className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200 flex items-center gap-1 cursor-pointer transition-colors"
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
                    className="px-2 py-1 rounded-lg bg-white hover:bg-brand-cream/40 text-brand-charcoal text-[10px] font-black border border-brand-green/15 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Radio className="w-2.5 h-2.5" />
                    <span>SMS</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Diagnostic & Troubleshooting Guide */}
          <div className="pt-2 border-t border-brand-green/10">
            <button
              type="button"
              onClick={() => setShowHelpGuide(!showHelpGuide)}
              className="w-full flex items-center justify-between text-[11px] text-brand-charcoal/60 hover:text-brand-green transition-colors py-1 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>On Blaze plan but SMS still not delivering?</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHelpGuide ? 'rotate-180' : ''}`} />
            </button>

            {showHelpGuide && (
              <div className="mt-2 p-3 rounded-xl bg-brand-cream/30 border border-brand-green/15 text-[11px] text-brand-charcoal/80 space-y-2.5">
                <div>
                  <strong className="text-brand-charcoal block mb-1">1. SMS Region Policy (Crucial for Blaze):</strong>
                  <p className="text-brand-charcoal/70">
                    To prevent automated toll fraud attacks, Google restricts SMS to specific countries on Blaze. In Firebase Console → <strong>Authentication</strong> → <strong>Settings</strong> → <strong>SMS region policy</strong>, verify that <strong>India (+91)</strong> is enabled in the allowed regions list.
                  </p>
                  <a
                    href="https://console.firebase.google.com/project/taash-bhatti/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-brand-green font-bold hover:underline mt-1"
                  >
                    <span>Open SMS Region Policy</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="pt-1.5 border-t border-brand-green/10">
                  <strong className="text-brand-charcoal block mb-1">2. Check Real SMS Delivery Logs:</strong>
                  <p className="text-brand-charcoal/70">
                    Firebase records the status of every SMS attempt sent by this project. Check your SMS Usage tab to see if your attempt was marked as <em>"Sent"</em>, <em>"Blocked by region policy"</em>, or <em>"Carrier error"</em>.
                  </p>
                  <a
                    href="https://console.firebase.google.com/project/taash-bhatti/authentication/usage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-brand-green font-bold hover:underline mt-1"
                  >
                    <span>Open Firebase SMS Usage Logs</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="pt-1.5 border-t border-brand-green/10">
                  <div className="flex items-center justify-between">
                    <strong className="text-brand-charcoal block">3. Authorized Domains:</strong>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard.writeText(window.location.hostname);
                          setDomainCopied(true);
                          setTimeout(() => setDomainCopied(false), 2000);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[10px] text-brand-green font-bold hover:underline cursor-pointer bg-brand-green/10 px-2 py-0.5 rounded"
                    >
                      {domainCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{domainCopied ? 'Copied!' : 'Copy Current Host'}</span>
                    </button>
                  </div>
                  <p className="text-brand-charcoal/70 mt-1">
                    Ensure <code className="text-brand-charcoal bg-black/5 px-1 py-0.5 rounded font-mono">{typeof window !== 'undefined' ? window.location.hostname : 'current domain'}</code> is added to Firebase Console → <strong>Authentication</strong> → <strong>Settings</strong> → <strong>Authorized domains</strong>.
                  </p>
                </div>

                <div className="pt-1.5 border-t border-brand-green/10">
                  <strong className="text-brand-charcoal block mb-1">4. TRAI DLT Telecom Scrubbing (+91 India):</strong>
                  <p className="text-brand-charcoal/70">
                    Indian telcos (Jio, Airtel, Vi) apply strict DLT filtering on foreign SMS gateways. If you need instantaneous authentication without telecom carrier dropouts, add your number under <strong>"Phone numbers for testing"</strong> in Firebase Console.
                  </p>
                  <a
                    href="https://console.firebase.google.com/project/taash-bhatti/authentication/providers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-brand-green font-bold hover:underline mt-1"
                  >
                    <span>Add Phone number for testing</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2.5: CHECKING SAVED ADDRESSES & PROFILES */}
      {step === 'checking_address' && (
        <div id="phone-auth-checking-address-step" className="py-8 flex flex-col items-center justify-center space-y-4 animate-fade-in text-center">
          <div className="relative flex items-center justify-center">
            {/* Pulsing Aura */}
            <span className="absolute -inset-4 rounded-full border border-brand-green/30 animate-ping pointer-events-none" style={{ animationDuration: '2s' }} />
            <div className="w-16 h-16 rounded-2xl bg-brand-charcoal border border-amber-500/40 p-2 flex items-center justify-center shadow-xl">
              <img
                src="https://cdn.postimage.me/2026/08/01/28172.png"
                alt="TAASH BHATTI"
                className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(255,140,0,0.6)]"
              />
            </div>
            <div className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-brand-green border-2 border-white flex items-center justify-center shadow">
              <MapPin className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className="space-y-1.5 max-w-xs">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-brand-green/10 text-brand-green text-[9px] font-black uppercase tracking-widest">
              STEP 3: LOCATION VAULT
            </span>
            <h4 className="text-sm font-extrabold text-brand-charcoal flex items-center justify-center gap-1.5">
              <span>Syncing Saved Doorstep Addresses</span>
              <div className="w-3.5 h-3.5 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
            </h4>
            <p className="text-xs text-brand-charcoal/70 font-medium">
              {addressCheckStatus}
            </p>
          </div>
        </div>
      )}

      {/* STEP 3: VERIFIED CELEBRATION */}
      {step === 'verified' && (
        <div className="py-8 flex flex-col items-center justify-center space-y-4 animate-fade-in text-center">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-charcoal border border-emerald-500/50 p-2 flex items-center justify-center shadow-xl">
              <img
                src="https://cdn.postimage.me/2026/08/01/28172.png"
                alt="TAASH BHATTI"
                className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.6)]"
              />
            </div>
            <div className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          </div>
          <div>
            <h4 className="text-base font-extrabold text-brand-charcoal">Session Authenticated!</h4>
            <p className="text-xs text-brand-charcoal/60 mt-0.5">Welcome to TAASH BHATTI. Opening your personalized feast dashboard...</p>
          </div>
        </div>
      )}
    </div>
  );
}
