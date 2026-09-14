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
  Eye,
  EyeOff,
  Zap,
  Copy
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
  // Steps: 'phone_input' | 'atp_input' | 'otp_input' | 'checking_address' | 'verified'
  const [step, setStep] = useState<'phone_input' | 'atp_input' | 'otp_input' | 'checking_address' | 'verified'>('phone_input');
  const [addressCheckStatus, setAddressCheckStatus] = useState<string>('Verifying saved delivery addresses...');

  // Input states
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState(defaultName);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // All-Time Password (ATP) zero-SMS bypass states
  const [knownUserAccount, setKnownUserAccount] = useState<{ user: User; id: string } | null>(null);
  const [atpDigits, setAtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [showAtpMasked, setShowAtpMasked] = useState<boolean>(true);
  const atpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // OTP states
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Status & Error states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Input refs for 6 OTP boxes
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const cleanupRecaptcha = () => {
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
    const container = document.getElementById('phone-recaptcha-container');
    if (container) {
      container.innerHTML = '';
    }
  };

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      cleanupRecaptcha();
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
  const getOrCreateRecaptcha = () => {
    if (typeof window === 'undefined') return null;

    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }

    const container = document.getElementById('phone-recaptcha-container');
    if (container) {
      container.innerHTML = '';
    }

    try {
      const verifier = new RecaptchaVerifier(auth, 'phone-recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          cleanupRecaptcha();
          setErrorMessage("reCAPTCHA verification expired. Please request a new code.");
        }
      });

      recaptchaVerifierRef.current = verifier;
      (window as any).phoneRecaptchaVerifier = verifier;
      return verifier;
    } catch (err: any) {
      console.warn("Recaptcha initialization warning, resetting container:", err);
      if (container) {
        container.innerHTML = '';
      }
      try {
        const verifier = new RecaptchaVerifier(auth, 'phone-recaptcha-container', {
          size: 'invisible',
          callback: () => {},
        });
        recaptchaVerifierRef.current = verifier;
        (window as any).phoneRecaptchaVerifier = verifier;
        return verifier;
      } catch (e2) {
        console.error("Secondary reCAPTCHA setup failure:", e2);
        return null;
      }
    }
  };

  // Helper: Dispatch Real SMS OTP via Firebase Phone Auth
  const dispatchRealSmsOtp = async () => {
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const verifier = getOrCreateRecaptcha();
      if (!verifier) {
        throw new Error("reCAPTCHA container initialization failed. Please try again.");
      }

      // Trigger Firebase Phone Auth SMS dispatch via cellular telecom
      const result = await signInWithPhoneNumber(auth, fullE164Phone, verifier);
      setConfirmationResult(result);
      setStep('otp_input');
      setTimerSeconds(60);
      setIsTimerRunning(true);
      setInfoMessage(`Verification code sent via SMS to ${fullE164Phone}`);
      
      // Auto-focus first input box
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    } catch (err: any) {
      console.warn("Firebase Phone Auth error:", err?.code, err?.message);
      cleanupRecaptcha();

      if (err?.code === 'auth/invalid-phone-number') {
        setErrorMessage("Invalid phone number format. Please check the digits and country code.");
      } else if (err?.code === 'auth/too-many-requests') {
        setErrorMessage("Too many SMS attempts for this number. Please wait a few minutes.");
      } else if (err?.code === 'auth/quota-exceeded') {
        setErrorMessage("Daily SMS quota reached on this network. Please try again shortly.");
      } else if (err?.code === 'auth/invalid-app-credential' || err?.message?.includes('invalid-app-credential')) {
        setErrorMessage("Device verification failed. Please check network connection and try again.");
      } else if (err?.code === 'auth/captcha-check-failed') {
        setErrorMessage("reCAPTCHA security check failed. Please request a new SMS code.");
      } else {
        setErrorMessage(err?.message || "Failed to send SMS code. Please check your network and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 1. Send OTP Request or Check ATP Handler
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
      // Step A: Check if account exists with this phone number and has an All-Time Password (ATP)
      const qUser = query(collection(db, 'users'), where('phone', '==', fullE164Phone));
      const snap = await getDocs(qUser).catch(() => null);

      if (snap && !snap.empty) {
        const docSnap = snap.docs[0];
        const existingData = docSnap.data() as User;

        // First-come first-served: preserve registered account name and email identity
        const cleanExistingEmail = existingData.email && !existingData.email.includes('@taashbhatti.phone') ? existingData.email : null;
        if (cleanExistingEmail && fullName.trim() && existingData.name && fullName.trim().toLowerCase() !== existingData.name.trim().toLowerCase()) {
          setFullName(existingData.name);
        }

        if (existingData.atp && existingData.atp.trim().length === 6) {
          // Account has an ATP! Present instant zero-SMS login screen
          setKnownUserAccount({ user: existingData, id: docSnap.id });
          setStep('atp_input');
          setAtpDigits(['', '', '', '', '', '']);
          setLoading(false);
          setTimeout(() => {
            atpInputRefs.current[0]?.focus();
          }, 300);
          return;
        }
      }

      // Step B: New user or no ATP configured -> Dispatch real SMS OTP
      await dispatchRealSmsOtp();
    } catch (err: any) {
      console.warn("handleSendOtp error:", err);
      await dispatchRealSmsOtp();
    }
  };

  // ATP Input Handlers
  const handleAtpDigitChange = (index: number, value: string) => {
    const cleanChar = value.replace(/\D/g, '');
    const newDigits = [...atpDigits];

    if (cleanChar.length > 0) {
      newDigits[index] = cleanChar[cleanChar.length - 1];
      setAtpDigits(newDigits);

      if (index < 5) {
        atpInputRefs.current[index + 1]?.focus();
      } else {
        const fullAtp = newDigits.join('');
        if (fullAtp.length === 6) {
          handleVerifyAtp(fullAtp);
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

  const handleVerifyAtp = async (codeToVerify?: string) => {
    const code = codeToVerify || atpDigits.join('');
    setErrorMessage(null);

    if (code.length !== 6) {
      setErrorMessage("Please enter all 6 digits of your All-Time Password.");
      return;
    }

    if (!knownUserAccount) {
      setErrorMessage("Account context missing. Please request an SMS OTP.");
      return;
    }

    if (code !== knownUserAccount.user.atp) {
      setErrorMessage("Incorrect All-Time Password (ATP). Please check or request an SMS OTP.");
      return;
    }

    // ATP is valid! Instant zero-cost login!
    setLoading(true);
    setStep('checking_address');
    setAddressCheckStatus('All-Time Password (ATP) verified! Loading your profile & addresses...');

    const finalProfile: User = {
      ...knownUserAccount.user,
      phone: fullE164Phone,
      isPhoneVerified: true,
    };

    try {
      localStorage.setItem('fitzaika_auth_session', 'true');
      localStorage.setItem('fitzaika_cached_user_profile', JSON.stringify(finalProfile));
      localStorage.setItem('fitzaika_cached_fb_user', JSON.stringify({
        uid: knownUserAccount.id,
        phoneNumber: fullE164Phone,
        displayName: finalProfile.name,
        email: finalProfile.email || '',
      }));
    } catch (e) {}

    // Plain logo verifying animation duration (1.2s)
    await new Promise(r => setTimeout(r, 1200));

    onSuccess({
      user: finalProfile,
      fbUser: {
        uid: knownUserAccount.id,
        phoneNumber: fullE164Phone,
        displayName: finalProfile.name,
        email: finalProfile.email || '',
      },
      isNewUser: false,
    });
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
      let resolvedFirebaseUser: any = null;
      let isNew = false;

      // Real Firebase confirmation via cellular SMS OTP
      if (!confirmationResult) {
        throw new Error("Session expired. Please request a new verification code.");
      }
      const cred = await confirmationResult.confirm(code);
      resolvedFirebaseUser = cred.user;

      // Step transition to checking saved addresses & user profile
      setStep('checking_address');
      setAddressCheckStatus('Checking your saved delivery addresses & account...');

      // Check or create Firestore User document
      const uid = resolvedFirebaseUser.uid;
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef).catch(() => null);

      let finalProfile: User;

      if (userSnap && userSnap.exists()) {
        const existingData = userSnap.data() as User;
        const cleanExistingEmail = existingData.email?.includes('@taashbhatti.phone') ? '' : (existingData.email || resolvedFirebaseUser.email || '');
        finalProfile = {
          ...existingData,
          phone: fullE164Phone,
          name: fullName.trim() || existingData.name || `Customer ${cleanPhone.slice(-4)}`,
          email: cleanExistingEmail,
        };
        // Check saved addresses count
        // Check saved addresses count
        const savedList = (existingData.savedAddresses || []).filter(a => typeof a === 'string' && a.trim().length > 0);
        const primaryAddr = (existingData.address && existingData.address.trim().length > 0) ? [existingData.address.trim()] : [];
        const uniqueAddresses = Array.from(new Set([...savedList, ...primaryAddr]));
        if (uniqueAddresses.length > 0) {
          setAddressCheckStatus(`✓ Found ${uniqueAddresses.length} saved doorstep address(es)! Synchronizing...`);
        } else {
          setAddressCheckStatus('Profile confirmed. No saved addresses found.');
        }

        const atpToUse = existingData.atp || Math.floor(100000 + Math.random() * 900000).toString();
        finalProfile = {
          ...existingData,
          phone: fullE164Phone,
          name: fullName.trim() || existingData.name || `Customer ${cleanPhone.slice(-4)}`,
          email: cleanExistingEmail,
          atp: atpToUse,
          atpUpdatedAt: existingData.atpUpdatedAt || new Date().toISOString(),
          isPhoneVerified: true,
        };

        // Update user record with phone, clean email, and ATP
        await setDoc(userRef, { 
          phone: fullE164Phone, 
          email: cleanExistingEmail, 
          atp: atpToUse, 
          isPhoneVerified: true 
        }, { merge: true }).catch(() => {});
      } else {
        isNew = true;
        setAddressCheckStatus('New customer account created. Setting up your profile & All-Time Password...');
        const newAtp = Math.floor(100000 + Math.random() * 900000).toString();
        finalProfile = {
          name: fullName.trim() || `Customer ${cleanPhone.slice(-4)}`,
          email: resolvedFirebaseUser.email || '',
          phone: fullE164Phone,
          isPhoneVerified: true,
          atp: newAtp,
          atpUpdatedAt: new Date().toISOString(),
          goal: 'general',
          preferredGymId: null,
          savedAddresses: [],
          savedPayments: [],
          onboardingCompleted: true,
          createdAt: new Date().toISOString(),
        };
        await setDoc(userRef, finalProfile).catch((err) => console.warn("User doc creation note:", err));
      }

      // Update Firebase Auth Display Name if provided
      if (resolvedFirebaseUser && fullName.trim()) {
        try {
          await updateProfile(resolvedFirebaseUser, { displayName: fullName.trim() });
        } catch (e) {}
      }

      // Cache session locally
      try {
        localStorage.setItem('fitzaika_cached_user_profile', JSON.stringify(finalProfile));
        localStorage.setItem('fitzaika_cached_fb_user', JSON.stringify({
          uid: resolvedFirebaseUser.uid,
          email: resolvedFirebaseUser.email || '',
          phoneNumber: fullE164Phone,
          displayName: finalProfile.name,
        }));
      } catch (e) {}

      // Plain logo verifying animation duration (1.2s)
      await new Promise(r => setTimeout(r, 1200));

      onSuccess({
        user: finalProfile,
        fbUser: resolvedFirebaseUser,
        isNewUser: isNew,
      });

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
        <form onSubmit={handleSendOtp} className="space-y-3.5">
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
            className="w-full bg-brand-green hover:bg-brand-green/95 text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Requesting Secure OTP...</span>
              </>
            ) : (
              <>
                <span>SEND VERIFICATION CODE</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Security Assurance Tag */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-brand-charcoal/50 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-green" />
            <span>End-to-End Encrypted SMS Verification</span>
          </div>
        </form>
      )}

      {/* STEP 1.5: ALL-TIME PASSWORD (ATP) ZERO-SMS LOGIN */}
      {step === 'atp_input' && (
        <div className="space-y-4 animate-fade-in">
          {/* Header with Phone & Change Button */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-black text-amber-600 tracking-wider">Zero-SMS Instant Login</span>
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
              className="px-2.5 py-1.5 rounded-xl bg-white text-brand-charcoal hover:text-amber-600 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Edit3 className="w-3 h-3" />
              <span>Change</span>
            </button>
          </div>

          {/* ATP Explanatory Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/25 space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs font-black text-brand-charcoal">Enter your All-Time Password (ATP)</p>
            </div>
            <p className="text-[11px] text-brand-charcoal/70 leading-relaxed pl-6">
              Use your permanent 6-digit passcode to authenticate instantly without waiting for cellular SMS.
            </p>
          </div>

          {/* 6 Individual ATP Input Boxes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-brand-charcoal/70">6-Digit ATP Passcode</label>
              <button
                type="button"
                onClick={() => setShowAtpMasked(!showAtpMasked)}
                className="text-[10px] font-bold text-amber-600 flex items-center gap-1 hover:underline cursor-pointer"
              >
                {showAtpMasked ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>{showAtpMasked ? 'Reveal' : 'Mask'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              {atpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (atpInputRefs.current[idx] = el)}
                  type={showAtpMasked ? 'password' : 'text'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleAtpDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleAtpKeyDown(idx, e)}
                  onPaste={handleAtpPaste}
                  className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-lg font-black rounded-2xl border transition-all outline-hidden ${
                    digit
                      ? 'border-amber-500 bg-amber-500/5 text-brand-charcoal shadow-xs ring-2 ring-amber-500/20'
                      : 'border-brand-green/20 bg-brand-cream/15 text-brand-charcoal focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200/50 text-red-600 text-[11px] font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Primary Action Button: Verify ATP */}
          <button
            type="button"
            onClick={() => handleVerifyAtp()}
            disabled={loading || atpDigits.join('').length !== 6}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying All-Time Password...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current" />
                <span>VERIFY ATP & LOGIN (ZERO SMS)</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-brand-green/10 w-full" />
            <span className="bg-white px-3 text-[10px] uppercase font-bold text-brand-charcoal/40 absolute">or</span>
          </div>

          {/* Secondary Action: Fallback to real cellular SMS */}
          <button
            type="button"
            onClick={dispatchRealSmsOtp}
            disabled={loading}
            className="w-full bg-brand-cream/30 hover:bg-brand-cream/60 text-brand-charcoal border border-brand-green/20 font-bold text-xs py-3 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5 text-brand-green" />
            <span>Don't have or forgot ATP? Send OTP via SMS</span>
          </button>
        </div>
      )}

      {/* STEP 2: 6-DIGIT OTP VERIFICATION */}
      {step === 'otp_input' && (
        <div className="space-y-4 animate-fade-in">
          {/* Header with Phone & Change Button */}
          <div className="bg-brand-cream/25 border border-brand-green/10 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black text-brand-charcoal/50 tracking-wider">Passcode Sent To</p>
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

          {/* Resend OTP Timer Controls */}
          <div className="flex items-center justify-between text-xs pt-1 px-1">
            <span className="text-brand-charcoal/50 text-[11px]">
              Didn't receive SMS?
            </span>
            {isTimerRunning ? (
              <span className="text-brand-charcoal/60 font-mono text-[11px]">
                Resend in <strong className="text-brand-charcoal font-black">{timerSeconds}s</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={loading}
                className="text-brand-orange hover:text-brand-orange/80 font-black text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Resend OTP</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 2.5: PLAIN VERIFYING SCREEN WITH OUR LOGO (No buttons) */}
      {step === 'checking_address' && (
        <div id="phone-auth-checking-address-step" className="py-10 flex flex-col items-center justify-center space-y-4 animate-fade-in text-center select-none">
          <div className="relative flex items-center justify-center">
            {/* Outer Golden Spinner Ring */}
            <span
              className="absolute -inset-5 rounded-full border-2 border-amber-400/40 border-t-amber-400 animate-spin pointer-events-none"
              style={{ animationDuration: '1.8s' }}
            />
            <span className="absolute -inset-2.5 rounded-full border border-orange-500/30 animate-pulse pointer-events-none" />

            {/* Taash Bhatti Logo Badge */}
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#1c222e] to-[#0d1117] border border-amber-500/40 p-3 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.25)]">
              <img
                src="https://cdn.postimage.me/2026/08/01/28172.png"
                alt="Taash Bhatti"
                className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(245,158,11,0.5)] animate-pulse"
              />
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="text-lg font-black text-brand-charcoal tracking-wide">Verifying.....</h4>
            <p className="text-xs text-brand-orange font-medium">Taash Bhatti Artisanal Kitchen</p>
          </div>
        </div>
      )}
    </div>
  );
}
