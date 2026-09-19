/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneCall,
  MessageSquare,
  MessageCircle,
  KeyRound, 
  ShieldCheck, 
  ArrowRight, 
  RotateCcw, 
  CheckCircle2, 
  Edit3, 
  AlertCircle, 
  Sparkles, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Zap,
  Mail,
  User as UserIcon
} from 'lucide-react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
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

interface PhoneAuthComponentProps {
  onSuccess: (userData: { user: User; fbUser: any; isNewUser: boolean }) => void;
  onCancel?: () => void;
  defaultName?: string;
}

type AuthStep = 
  | 'phone_input'          // Step 1: Enter mobile number
  | 'registered_verify'     // Step 2A: Registered user -> Ask "Do you have your 6-digit code (ATP)?" or "Send SMS OTP"
  | 'new_user_otp'          // Step 2B: New user -> Enter SMS OTP
  | 'new_user_profile'      // Step 2C: New user -> Full Name + Optional Email (uniqueness check)
  | 'verifying';            // Step 3: Plain logo animation screen (1.2s, 0 buttons)

export default function PhoneAuthComponent({
  onSuccess,
  onCancel,
  defaultName = '',
}: PhoneAuthComponentProps) {
  const [step, setStep] = useState<AuthStep>('phone_input');

  // Input states
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState(defaultName);
  const [email, setEmail] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // 2Factor OTP Delivery Channels: 'voice' (Receive a Call) | 'sms' | 'whatsapp'
  const [selectedChannel, setSelectedChannel] = useState<'voice' | 'sms' | 'whatsapp'>('voice');
  const [activeDeliveryChannel, setActiveDeliveryChannel] = useState<'voice' | 'sms' | 'whatsapp'>('voice');
  const [twoFactorSessionId, setTwoFactorSessionId] = useState<string | null>(null);
  const [isUsingTwoFactor, setIsUsingTwoFactor] = useState<boolean>(true);

  // Registered account state
  const [knownUserAccount, setKnownUserAccount] = useState<{ user: User; id: string } | null>(null);
  const [verifyMode, setVerifyMode] = useState<'atp' | 'sms'>('atp'); // within registered_verify

  // ATP input states
  const [atpDigits, setAtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [showAtpMasked, setShowAtpMasked] = useState<boolean>(true);
  const atpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // SMS / Voice OTP states
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Status & Error states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  useEffect(() => {
    return () => {
      cleanupRecaptcha();
    };
  }, []);

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

  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const fullE164Phone = `${selectedCountry.code}${cleanPhone}`;

  // Invisible reCAPTCHA helper
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
        callback: () => {},
        'expired-callback': () => {
          cleanupRecaptcha();
          setErrorMessage('reCAPTCHA expired. Please request a new code.');
        },
      });

      recaptchaVerifierRef.current = verifier;
      (window as any).phoneRecaptchaVerifier = verifier;
      return verifier;
    } catch (err: any) {
      console.warn('reCAPTCHA init error, resetting container:', err);
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
        console.error('Secondary reCAPTCHA setup failure:', e2);
        return null;
      }
    }
  };

  // Helper: Dispatch 2Factor OTP (Voice Call, SMS, WhatsApp)
  const dispatchTwoFactorOtp = async (channel: 'voice' | 'sms' | 'whatsapp' = selectedChannel) => {
    setErrorMessage(null);
    setLoading(true);
    setActiveDeliveryChannel(channel);
    setSelectedChannel(channel);

    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullE164Phone, channel }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch verification code via 2Factor.');
      }

      setTwoFactorSessionId(data.sessionId);
      setIsUsingTwoFactor(true);
      setTimerSeconds(60);
      setIsTimerRunning(true);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
      return true;
    } catch (err: any) {
      console.error('2Factor dispatch error:', err);
      setErrorMessage(err.message || 'Failed to dispatch verification code.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Helper: Dispatch real cellular SMS OTP via Firebase Auth (with 2Factor fallback)
  const dispatchRealSmsOtp = async () => {
    setErrorMessage(null);
    setLoading(true);

    try {
      cleanupRecaptcha();
      const verifier = getOrCreateRecaptcha();
      if (!verifier) {
        throw new Error('Could not initialize SMS verification security layer.');
      }

      const confirmation = await signInWithPhoneNumber(auth, fullE164Phone, verifier);
      setConfirmationResult(confirmation);
      setIsUsingTwoFactor(false);
      setTimerSeconds(60);
      setIsTimerRunning(true);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
      return true;
    } catch (err: any) {
      console.error('Failed to dispatch cellular SMS OTP, falling back to 2Factor:', err);
      cleanupRecaptcha();
      // Fallback directly to 2Factor gateway
      return await dispatchTwoFactorOtp('sms');
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: User enters phone number and taps Continue
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (cleanPhone.length < selectedCountry.length - 2) {
      setErrorMessage(`Please enter a valid ${selectedCountry.length}-digit mobile phone number.`);
      return;
    }

    setLoading(true);

    try {
      // Check if account already exists with this phone number
      const qUser = query(collection(db, 'users'), where('phone', '==', fullE164Phone));
      const snap = await getDocs(qUser).catch(() => null);

      if (snap && !snap.empty) {
        // REGISTERED USER FOUND!
        const docSnap = snap.docs[0];
        const existingData = docSnap.data() as User;

        setKnownUserAccount({ user: existingData, id: docSnap.id });
        if (existingData.name) {
          setFullName(existingData.name);
        }
        if (existingData.email && !existingData.email.includes('@taashbhatti.phone')) {
          setEmail(existingData.email);
        }

        // Ask: "Do you have your 6-digit code (ATP)?"
        setVerifyMode('atp');
        setStep('registered_verify');
        setAtpDigits(['', '', '', '', '', '']);
        setTimeout(() => {
          atpInputRefs.current[0]?.focus();
        }, 300);
      } else {
        // NEW FIRST-TIME USER!
        // Dispatch chosen 2Factor OTP (Voice Call, SMS, WhatsApp)
        const sent = await dispatchTwoFactorOtp(selectedChannel);
        if (sent) {
          setStep('new_user_otp');
        }
      }
    } catch (err: any) {
      console.error('Error checking account:', err);
      const sent = await dispatchTwoFactorOtp(selectedChannel);
      if (sent) {
        setStep('new_user_otp');
      }
    } finally {
      setLoading(false);
    }
  };

  // ATP Input Digit Handler
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

  // Verify ATP for registered account
  const handleVerifyAtp = async (codeToVerify?: string) => {
    const code = codeToVerify || atpDigits.join('');
    setErrorMessage(null);

    if (code.length !== 6) {
      setErrorMessage('Please enter all 6 digits of your All-Time Password.');
      return;
    }

    if (!knownUserAccount) {
      setErrorMessage('Account context not found. Please request an SMS OTP.');
      return;
    }

    if (code !== knownUserAccount.user.atp) {
      setErrorMessage('Incorrect All-Time Password (ATP). Please check or request an SMS OTP.');
      return;
    }

    // ATP verified!
    setLoading(true);
    setStep('verifying');

    const finalProfile: User = {
      ...knownUserAccount.user,
      phone: fullE164Phone,
      isPhoneVerified: true,
    };

    try {
      localStorage.setItem('fitzaika_auth_session', 'true');
      localStorage.setItem('fitzaika_cached_user_profile', JSON.stringify(finalProfile));
      localStorage.setItem(
        'fitzaika_cached_fb_user',
        JSON.stringify({
          uid: knownUserAccount.id,
          phoneNumber: fullE164Phone,
          displayName: finalProfile.name,
          email: finalProfile.email || '',
        })
      );
    } catch (e) {}

    // 1.2s logo verifying animation
    await new Promise((r) => setTimeout(r, 1200));

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

  // Switch registered user to SMS OTP
  const handleRequestSmsOtpForRegistered = async () => {
    const sent = await dispatchTwoFactorOtp('sms');
    if (sent) {
      setVerifyMode('sms');
    }
  };

  // Switch registered user to Voice Call OTP
  const handleRequestVoiceOtpForRegistered = async () => {
    const sent = await dispatchTwoFactorOtp('voice');
    if (sent) {
      setVerifyMode('sms');
    }
  };

  // SMS OTP Digit Handler
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

  // Verify OTP (2Factor or Firebase Auth)
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    setErrorMessage(null);

    if (code.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);

    // Flow 1: 2Factor verification (Voice / SMS / WhatsApp)
    if (isUsingTwoFactor && twoFactorSessionId) {
      try {
        const res = await fetch('/api/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: twoFactorSessionId,
            otp: code,
            phone: fullE164Phone,
            channel: activeDeliveryChannel,
          }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Invalid or expired OTP entered.');
        }

        if (knownUserAccount) {
          setStep('verifying');

          const finalProfile: User = {
            ...knownUserAccount.user,
            phone: fullE164Phone,
            isPhoneVerified: true,
          };

          try {
            localStorage.setItem('fitzaika_auth_session', 'true');
            localStorage.setItem('fitzaika_cached_user_profile', JSON.stringify(finalProfile));
            localStorage.setItem(
              'fitzaika_cached_fb_user',
              JSON.stringify({
                uid: knownUserAccount.id,
                phoneNumber: fullE164Phone,
                displayName: finalProfile.name,
                email: finalProfile.email || '',
              })
            );
          } catch (e) {}

          await new Promise((r) => setTimeout(r, 1200));

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
          return;
        } else {
          setStep('new_user_profile');
          return;
        }
      } catch (err: any) {
        console.error('2Factor verify error:', err);
        setErrorMessage(err.message || 'Incorrect verification code. Please check and try again.');
        setLoading(false);
        return;
      }
    }

    // Flow 2: Firebase confirmationResult fallback
    if (!confirmationResult) {
      setErrorMessage('Verification session expired. Please request a new code.');
      setLoading(false);
      return;
    }

    try {
      const cred = await confirmationResult.confirm(code);
      const fbUser = cred.user;

      if (knownUserAccount) {
        // Registered user logging in via SMS
        setStep('verifying');

        const finalProfile: User = {
          ...knownUserAccount.user,
          phone: fullE164Phone,
          isPhoneVerified: true,
        };

        try {
          localStorage.setItem('fitzaika_auth_session', 'true');
          localStorage.setItem('fitzaika_cached_user_profile', JSON.stringify(finalProfile));
          localStorage.setItem(
            'fitzaika_cached_fb_user',
            JSON.stringify({
              uid: fbUser.uid,
              phoneNumber: fullE164Phone,
              displayName: finalProfile.name,
              email: finalProfile.email || '',
            })
          );
        } catch (e) {}

        // 1.2s logo verifying animation
        await new Promise((r) => setTimeout(r, 1200));

        onSuccess({
          user: finalProfile,
          fbUser,
          isNewUser: false,
        });
      } else {
        // New user! Move to profile completion (Name + Optional Email)
        setStep('new_user_profile');
      }
    } catch (err: any) {
      console.error('OTP confirmation error:', err);
      if (err?.code === 'auth/invalid-verification-code') {
        setErrorMessage('Incorrect 6-digit SMS code. Please check and try again.');
      } else if (err?.code === 'auth/code-expired') {
        setErrorMessage('This verification code has expired. Please tap Resend Code.');
      } else {
        setErrorMessage(err?.message || 'Verification failed. Please check the code and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // STEP 2C: New User completes profile (Full Name + Optional Email)
  const handleCompleteNewUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    setLoading(true);

    try {
      // If optional email is provided, validate uniqueness
      if (cleanEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          setErrorMessage('Please enter a valid email address, or leave it blank.');
          setLoading(false);
          return;
        }

        // First come, first served: check if email is already in use
        const qEmail = query(collection(db, 'users'), where('email', '==', cleanEmail));
        const emailSnap = await getDocs(qEmail).catch(() => null);

        if (emailSnap && !emailSnap.empty) {
          setErrorMessage(
            'This email address is already linked to an existing account. First come, first served. Please enter a different email or leave it blank.'
          );
          setLoading(false);
          return;
        }
      }

      // Generate permanent 6-digit All-Time Password (ATP)
      const newAtp = Math.floor(100000 + Math.random() * 900000).toString();
      const currentUser = auth.currentUser;
      const uid = currentUser?.uid || `user_${cleanPhone}`;

      const finalProfile: User = {
        name: fullName.trim(),
        email: cleanEmail || '',
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

      // Save to Firestore
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, finalProfile, { merge: true }).catch((err) =>
        console.warn('User creation warning:', err)
      );

      // Update Firebase Auth display name
      if (currentUser && fullName.trim()) {
        try {
          await updateProfile(currentUser, { displayName: fullName.trim() });
        } catch (e) {}
      }

      // Cache session
      try {
        localStorage.setItem('fitzaika_auth_session', 'true');
        localStorage.setItem('fitzaika_cached_user_profile', JSON.stringify(finalProfile));
        localStorage.setItem(
          'fitzaika_cached_fb_user',
          JSON.stringify({
            uid,
            phoneNumber: fullE164Phone,
            displayName: fullName.trim(),
            email: cleanEmail || '',
          })
        );
      } catch (e) {}

      // Transition to Plain Logo Verifying screen
      setStep('verifying');

      // 1.2s logo verifying animation
      await new Promise((r) => setTimeout(r, 1200));

      onSuccess({
        user: finalProfile,
        fbUser: currentUser || { uid, phoneNumber: fullE164Phone, displayName: fullName.trim(), email: cleanEmail },
        isNewUser: true,
      });
    } catch (err: any) {
      console.error('Error completing profile:', err);
      setErrorMessage(err?.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Plain Logo Verifying Screen (Zero buttons, full screen #070A0D)
  if (step === 'verifying') {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-6 bg-[#070A0D] select-none animate-fade-in font-sans">
        <div className="relative flex items-center justify-center mb-6">
          {/* Golden Spinner Ring */}
          <span
            className="absolute -inset-5 rounded-full border-2 border-amber-400/40 border-t-amber-400 animate-spin pointer-events-none"
            style={{ animationDuration: '1.8s' }}
          />
          <span className="absolute -inset-2.5 rounded-full border border-orange-500/30 animate-pulse pointer-events-none" />

          {/* Taash Bhatti Crest Logo */}
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
    <div className="w-full space-y-4 font-sans">
      {/* Hidden reCAPTCHA anchor */}
      <div id="phone-recaptcha-container" className="my-1 flex justify-center overflow-hidden" />

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-3 rounded-2xl bg-red-50 border border-red-200/50 text-red-600 text-xs font-bold flex items-start gap-2 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 1: PHONE NUMBER INPUT */}
      {/* ============================================================ */}
      {step === 'phone_input' && (
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <div className="bg-brand-green/5 border border-brand-green/10 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-brand-charcoal">
            <div className="w-8 h-8 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-brand-charcoal">Fast Mobile Sign-In</p>
              <p className="text-[10px] text-brand-charcoal/60">
                Sign in with an instant automated call, SMS, or All-Time Password (ATP).
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-brand-charcoal/60 block tracking-wide">
              Mobile Phone Number
            </label>
            <div className="flex items-center gap-2">
              {/* Country Code Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                  className="h-12 px-2.5 bg-brand-cream/20 hover:bg-brand-cream/40 border border-brand-green/15 rounded-xl text-xs font-bold text-brand-charcoal flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <span className="text-sm">{selectedCountry.flag}</span>
                  <span>{selectedCountry.code}</span>
                  <ChevronDown className="w-3 h-3 text-brand-charcoal/40" />
                </button>

                {showCountryPicker && (
                  <div className="absolute top-14 left-0 z-30 w-56 max-h-56 overflow-y-auto bg-white border border-brand-green/15 rounded-2xl shadow-xl p-1.5 space-y-1 custom-scrollbar">
                    {COUNTRY_CODES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c);
                          setShowCountryPicker(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-brand-cream/40 transition-colors ${
                          selectedCountry.code === c.code ? 'bg-brand-green/10 text-brand-green' : 'text-brand-charcoal'
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
                  className="w-full h-12 bg-brand-cream/15 border border-brand-green/15 rounded-xl px-3.5 text-sm font-bold tracking-wider text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                />
                {cleanPhone && (
                  <span className="absolute right-3 top-3.5 text-[10px] font-mono text-brand-charcoal/40">
                    {cleanPhone.length}/{selectedCountry.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Method Selection: Voice Call, SMS, WhatsApp */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-brand-charcoal/60 block tracking-wide">
              Select OTP Delivery Option
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedChannel('voice')}
                className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  selectedChannel === 'voice'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-800 ring-1 ring-amber-500/30'
                    : 'bg-white border-brand-green/15 text-brand-charcoal/70 hover:bg-brand-cream/30'
                }`}
              >
                <PhoneCall className="w-4 h-4 text-amber-600" />
                <span className="text-[10px] font-bold">Receive Call</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedChannel('sms')}
                className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  selectedChannel === 'sms'
                    ? 'bg-brand-green/15 border-brand-green text-brand-green ring-1 ring-brand-green/30'
                    : 'bg-white border-brand-green/15 text-brand-charcoal/70 hover:bg-brand-cream/30'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-brand-green" />
                <span className="text-[10px] font-bold">SMS OTP</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedChannel('whatsapp')}
                className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  selectedChannel === 'whatsapp'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500/30'
                    : 'bg-white border-brand-green/15 text-brand-charcoal/70 hover:bg-brand-cream/30'
                }`}
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-[10px] font-bold">WhatsApp</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || cleanPhone.length < selectedCountry.length - 2}
            className="w-full bg-brand-green hover:bg-brand-green/95 text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {selectedChannel === 'voice' ? (
                  <>
                    <PhoneCall className="w-4 h-4" />
                    <span>Receive Verification Call</span>
                  </>
                ) : selectedChannel === 'whatsapp' ? (
                  <>
                    <MessageCircle className="w-4 h-4" />
                    <span>Send WhatsApp Code</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    <span>Send SMS Verification Code</span>
                  </>
                )}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-brand-charcoal/50 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-green" />
            <span>Taash Bhatti Secure OTP & All-Time Password (ATP)</span>
          </div>
        </form>
      )}

      {/* ============================================================ */}
      {/* STEP 2A: REGISTERED USER LOGIN (ATP vs SMS / CALL) */}
      {/* ============================================================ */}
      {step === 'registered_verify' && (
        <div className="space-y-4 animate-fade-in">
          {/* Header Card with Number & Change Button */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black text-amber-600 tracking-wider">
                  Registered Account
                </span>
                <p className="text-xs font-black text-brand-charcoal">{fullE164Phone}</p>
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

          {/* Mode 1: ATP Code Entry (Default) */}
          {verifyMode === 'atp' ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/25 space-y-1 text-center">
                <div className="inline-flex items-center gap-1.5 text-xs font-black text-brand-charcoal">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  <span>Do you have your 6-digit code (ATP)?</span>
                </div>
                <p className="text-[11px] text-brand-charcoal/70 leading-relaxed">
                  Enter your All-Time Password for instant sign-in without waiting for SMS or Call.
                </p>
              </div>

              {/* 6 ATP Digit Boxes */}
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

                <div className="flex justify-between gap-1.5 sm:gap-2">
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
                      className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-lg font-black rounded-2xl border transition-all outline-none ${
                        digit
                          ? 'border-amber-500 bg-amber-500/5 text-brand-charcoal ring-2 ring-amber-500/20'
                          : 'border-brand-green/20 bg-brand-cream/15 text-brand-charcoal focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleVerifyAtp()}
                disabled={loading || atpDigits.join('').length !== 6}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>VERIFY WITH ATP & SIGN IN</span>
                  </>
                )}
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-brand-green/10 w-full" />
                <span className="bg-white px-3 text-[10px] uppercase font-bold text-brand-charcoal/40 absolute">or</span>
              </div>

              {/* Options to Receive a Call or send SMS */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleRequestVoiceOtpForRegistered}
                  disabled={loading}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/25 font-bold text-xs py-2.5 px-2 rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
                  <span>Receive a Call</span>
                </button>
                <button
                  type="button"
                  onClick={handleRequestSmsOtpForRegistered}
                  disabled={loading}
                  className="bg-brand-cream/30 hover:bg-brand-cream/60 text-brand-charcoal border border-brand-green/20 font-bold text-xs py-2.5 px-2 rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-brand-green" />
                  <span>Send SMS OTP</span>
                </button>
              </div>
            </div>
          ) : (
            /* Mode 2: Verification Code Entry for registered user */
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-brand-cream/25 border border-brand-green/15 text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-black text-brand-charcoal">
                  {activeDeliveryChannel === 'voice' ? (
                    <>
                      <PhoneCall className="w-4 h-4 text-amber-600 animate-pulse" />
                      <span>Calling Your Phone...</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 text-brand-green" />
                      <span>Enter SMS Verification Code</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-brand-charcoal/70">
                  {activeDeliveryChannel === 'voice' ? (
                    <>Answer the call on <span className="font-bold">{fullE164Phone}</span> to hear your code.</>
                  ) : (
                    <>6-digit SMS code dispatched to <span className="font-bold">{fullE164Phone}</span></>
                  )}
                </p>
              </div>

              {/* 6 OTP Digit Boxes */}
              <div className="flex justify-between gap-1.5 sm:gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-lg font-black rounded-2xl border transition-all outline-none ${
                      digit
                        ? 'border-brand-green bg-brand-green/5 text-brand-charcoal ring-2 ring-brand-green/20'
                        : 'border-brand-green/20 bg-brand-cream/15 text-brand-charcoal focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/20'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={loading || otpDigits.join('').length !== 6}
                className="w-full bg-brand-green hover:bg-brand-green/95 text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>VERIFY CODE & SIGN IN</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setVerifyMode('atp')}
                  className="text-amber-600 font-bold hover:underline cursor-pointer"
                >
                  ← Back to ATP Login
                </button>

                {isTimerRunning ? (
                  <span className="text-brand-charcoal/50 text-[11px]">Resend in {timerSeconds}s</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => dispatchTwoFactorOtp('voice')}
                      disabled={loading}
                      className="text-amber-600 font-bold hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>Call me</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatchTwoFactorOtp('sms')}
                      disabled={loading}
                      className="text-brand-green font-bold hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>SMS</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 2B: NEW USER STRICT OTP (VOICE / SMS / WHATSAPP) */}
      {/* ============================================================ */}
      {step === 'new_user_otp' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-brand-cream/25 border border-brand-green/10 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                {activeDeliveryChannel === 'voice' ? (
                  <PhoneCall className="w-4 h-4 text-amber-600" />
                ) : activeDeliveryChannel === 'whatsapp' ? (
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase font-black text-brand-charcoal/50 tracking-wider">
                  {activeDeliveryChannel === 'voice'
                    ? 'Automated Call To'
                    : activeDeliveryChannel === 'whatsapp'
                    ? 'WhatsApp Code Sent To'
                    : 'SMS Code Sent To'}
                </p>
                <p className="text-xs font-black text-brand-charcoal">{fullE164Phone}</p>
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

          <div className="p-3.5 rounded-2xl bg-brand-green/5 border border-brand-green/10 text-center space-y-1">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-black uppercase tracking-wider mb-0.5">
              {activeDeliveryChannel === 'voice' ? (
                <>
                  <PhoneCall className="w-3 h-3 text-amber-600 animate-pulse" />
                  <span>Incoming Voice Call Verification</span>
                </>
              ) : activeDeliveryChannel === 'whatsapp' ? (
                <>
                  <MessageCircle className="w-3 h-3 text-emerald-600" />
                  <span>WhatsApp Verification</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-3 h-3 text-brand-green" />
                  <span>SMS Verification</span>
                </>
              )}
            </div>
            <p className="text-xs font-black text-brand-charcoal">
              {activeDeliveryChannel === 'voice'
                ? 'Answer the incoming call to hear your code'
                : 'Enter 6-digit verification code'}
            </p>
            <p className="text-[11px] text-brand-charcoal/70">
              {activeDeliveryChannel === 'voice'
                ? 'Our automated system will read your 6-digit code clearly.'
                : 'Enter the code sent to your mobile phone.'}
            </p>
          </div>

          {/* 6 OTP Digit Boxes */}
          <div className="flex justify-between gap-1.5 sm:gap-2">
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                onPaste={handleOtpPaste}
                className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-lg font-black rounded-2xl border transition-all outline-none ${
                  digit
                    ? 'border-brand-green bg-brand-green/5 text-brand-charcoal ring-2 ring-brand-green/20'
                    : 'border-brand-green/20 bg-brand-cream/15 text-brand-charcoal focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/20'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleVerifyOtp()}
            disabled={loading || otpDigits.join('').length !== 6}
            className="w-full bg-brand-green hover:bg-brand-green/95 text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>CONFIRM & COMPLETE PROFILE</span>
              </>
            )}
          </button>

          {/* Channel Switchers & Resend Controls */}
          <div className="space-y-2 pt-1 border-t border-brand-green/10">
            <div className="text-center text-xs">
              {isTimerRunning ? (
                <span className="text-brand-charcoal/50 text-[11px]">Resend code in {timerSeconds}s</span>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => dispatchTwoFactorOtp('voice')}
                    disabled={loading}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <PhoneCall className="w-3 h-3 text-amber-600" />
                    <span>Receive a Call</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatchTwoFactorOtp('sms')}
                    disabled={loading}
                    className="px-2.5 py-1 rounded-lg bg-brand-cream/30 text-brand-charcoal hover:bg-brand-cream/60 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <MessageSquare className="w-3 h-3 text-brand-green" />
                    <span>Send SMS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatchTwoFactorOtp('whatsapp')}
                    disabled={loading}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/25 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <MessageCircle className="w-3 h-3 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              )}
            </div>

            {/* Instant "Receive a Call" shortcut if user is on SMS or WhatsApp */}
            {activeDeliveryChannel !== 'voice' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => dispatchTwoFactorOtp('voice')}
                  disabled={loading}
                  className="text-xs text-amber-700 hover:text-amber-800 font-bold inline-flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <PhoneCall className="w-3 h-3 text-amber-600" />
                  <span>Didn&apos;t get the code? Tap to Receive a Call</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 2C: NEW USER PROFILE (FULL NAME + OPTIONAL EMAIL) */}
      {/* ============================================================ */}
      {step === 'new_user_profile' && (
        <form onSubmit={handleCompleteNewUserProfile} className="space-y-4 animate-fade-in">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-brand-green/10 via-amber-500/10 to-brand-green/5 border border-brand-green/15 text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-green/15 text-brand-green text-[10px] font-black uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Phone Verified ✓</span>
            </div>
            <h4 className="text-sm font-black text-brand-charcoal">Complete Your Feast Profile</h4>
            <p className="text-[11px] text-brand-charcoal/70">
              Personalize your account and save your permanent All-Time Password (ATP).
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-brand-charcoal/70 flex items-center justify-between">
              <span>Full Name</span>
              <span className="text-brand-orange text-[9px]">Required *</span>
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-brand-charcoal/40 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Rohan Varma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-11 bg-brand-cream/15 border border-brand-green/15 rounded-xl pl-10 pr-3.5 text-xs font-bold text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-green/20"
              />
            </div>
          </div>

          {/* Optional Email */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-brand-charcoal/70 flex items-center justify-between">
              <span>Email Address</span>
              <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded text-[9px] font-black">
                Optional
              </span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-brand-charcoal/40 absolute left-3.5 top-3.5" />
              <input
                type="email"
                placeholder="you@example.com (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 bg-brand-cream/15 border border-brand-green/15 rounded-xl pl-10 pr-3.5 text-xs font-bold text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-green/20"
              />
            </div>
            <p className="text-[10px] text-brand-charcoal/60 leading-tight pt-0.5">
              💡 Add an email to sign in using either email or phone for this account. Cannot be an email already in use.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !fullName.trim()}
            className="w-full bg-brand-green hover:bg-brand-green/95 text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>ENTER TAASH BHATTI KITCHEN</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
