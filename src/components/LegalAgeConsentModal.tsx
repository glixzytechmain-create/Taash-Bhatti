/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Flame, 
  Scale, 
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const LEGAL_AGE_CONSENT_KEY = 'taash_legal_age_consent_v1';

export function hasAcceptedLegalAgeConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(LEGAL_AGE_CONSENT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveLegalAgeConsent(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LEGAL_AGE_CONSENT_KEY, 'true');
    } catch (e) {
      console.warn('Failed to persist legal age consent to localStorage:', e);
    }
  }
}

export function clearLegalAgeConsent(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LEGAL_AGE_CONSENT_KEY);
    } catch (e) {
      console.warn('Failed to clear legal age consent from localStorage:', e);
    }
  }
}

interface LegalAgeConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onCancel?: () => void;
  onOpenLegal?: (tab: 'terms' | 'privacy') => void;
}

export default function LegalAgeConsentModal({
  isOpen,
  onAccept,
  onCancel,
  onOpenLegal,
}: LegalAgeConsentModalProps) {
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [showValidationMsg, setShowValidationMsg] = useState(false);

  // Reset checkboxes whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setAgreeTerms(false);
      setAgreeAge(false);
      setShowValidationMsg(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canProceed = agreeTerms && agreeAge;

  const handleConfirm = () => {
    if (!canProceed) {
      setShowValidationMsg(true);
      return;
    }
    saveLegalAgeConsent();
    onAccept();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-white rounded-[32px] border border-brand-green/20 shadow-2xl overflow-hidden my-auto"
        >
          {/* TOP DECORATIVE PATTERN */}
          <div className="h-2 w-full bg-gradient-to-r from-brand-green via-brand-orange to-brand-green" />

          {/* CLOSE / GUEST BUTTON */}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-brand-cream/60 hover:bg-brand-cream text-brand-charcoal/60 hover:text-brand-charcoal flex items-center justify-center transition-colors cursor-pointer z-10"
              aria-label="Close or browse as guest"
              title="Browse as guest"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="p-6 sm:p-7 space-y-5">
            {/* HEADER ICON & TITLE */}
            <div className="text-center space-y-2.5">
              <div className="w-14 h-14 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center mx-auto shadow-xs border border-brand-green/15">
                <Scale className="w-7 h-7 text-brand-green" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange text-[10px] font-black uppercase tracking-wider mb-1">
                  <Flame className="w-3 h-3 text-brand-orange fill-brand-orange" />
                  Patron Protection & Governance
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
                  Legal Agreement & Age Verification
                </h3>
              </div>
              <p className="text-xs text-brand-charcoal/70 max-w-sm mx-auto leading-relaxed">
                Before accessing your Taash Bhatti Cloud Vault, placing orders, or registering your account, please review and accept our policies.
              </p>
            </div>

            {/* DIRECT LINKS TO FULL DOCUMENTS */}
            <div className="bg-brand-cream/40 border border-brand-green/15 rounded-2xl p-3.5 space-y-2.5">
              <div className="text-[11px] font-black uppercase tracking-wider text-brand-charcoal/70 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-green" />
                <span>Review Official Policies</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onOpenLegal?.('terms')}
                  className="flex items-center justify-between px-3 py-2 bg-white hover:bg-brand-green/5 border border-brand-green/20 rounded-xl text-xs font-bold text-brand-charcoal hover:text-brand-green transition-colors cursor-pointer group shadow-3xs"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 text-brand-green shrink-0" />
                    <span className="truncate">Terms of Service</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-brand-charcoal/40 group-hover:text-brand-green shrink-0 ml-1" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLegal?.('privacy')}
                  className="flex items-center justify-between px-3 py-2 bg-white hover:bg-brand-green/5 border border-brand-green/20 rounded-xl text-xs font-bold text-brand-charcoal hover:text-brand-green transition-colors cursor-pointer group shadow-3xs"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-green shrink-0" />
                    <span className="truncate">Privacy Policy</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-brand-charcoal/40 group-hover:text-brand-green shrink-0 ml-1" />
                </button>
              </div>
            </div>

            {/* MANDATORY CONSENT CHECKBOXES */}
            <div className="space-y-3 pt-1">
              {/* CHECKBOX 1: TERMS & CONDITIONS + PRIVACY POLICY */}
              <label className="flex items-start gap-3 p-3 bg-white border border-brand-green/15 rounded-2xl cursor-pointer hover:bg-brand-cream/20 transition-all select-none shadow-3xs">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => {
                    setAgreeTerms(e.target.checked);
                    if (showValidationMsg) setShowValidationMsg(false);
                  }}
                  className="mt-0.5 w-5 h-5 rounded-md text-brand-green border-brand-green/30 focus:ring-brand-green/20 accent-brand-green cursor-pointer shrink-0"
                />
                <span className="text-xs text-brand-charcoal leading-relaxed">
                  I have read, understood, and agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLegal?.('terms');
                    }}
                    className="font-black text-brand-green hover:underline cursor-pointer inline"
                  >
                    Terms & Conditions
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLegal?.('privacy');
                    }}
                    className="font-black text-brand-green hover:underline cursor-pointer inline"
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>

              {/* CHECKBOX 2: AGE VERIFICATION (18+ OR 13+ WITH PARENTAL PERMISSION) */}
              <label className="flex items-start gap-3 p-3 bg-white border border-brand-green/15 rounded-2xl cursor-pointer hover:bg-brand-cream/20 transition-all select-none shadow-3xs">
                <input
                  type="checkbox"
                  checked={agreeAge}
                  onChange={(e) => {
                    setAgreeAge(e.target.checked);
                    if (showValidationMsg) setShowValidationMsg(false);
                  }}
                  className="mt-0.5 w-5 h-5 rounded-md text-brand-green border-brand-green/30 focus:ring-brand-green/20 accent-brand-green cursor-pointer shrink-0"
                />
                <span className="text-xs text-brand-charcoal leading-relaxed">
                  <span className="font-black text-brand-charcoal">Age Confirmation: </span>
                  I confirm that <strong className="text-brand-green">I am 18 years of age or above</strong>, OR{' '}
                  <strong className="text-brand-green">I am 13+ and have my parent&apos;s / legal guardian&apos;s permission</strong>{' '}
                  to access and use this service.
                </span>
              </label>
            </div>

            {/* VALIDATION WARNING */}
            {showValidationMsg && !canProceed && (
              <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Please select both checkboxes to verify your agreement and age declaration.</span>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!canProceed}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
                  canProceed
                    ? 'bg-brand-green hover:bg-brand-green/90 text-white cursor-pointer hover:shadow-lg'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed opacity-75'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Agree & Continue to Account</span>
              </button>

              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-brand-charcoal/50 hover:text-brand-charcoal transition-colors cursor-pointer text-center"
                >
                  Decline & Browse Offline as Guest
                </button>
              )}
            </div>

            {/* DEVICE MEMORY FOOTNOTE */}
            <p className="text-[10px] text-center text-brand-charcoal/40 pt-1">
              🔒 This verification is stored locally on this device and will not appear again unless application data is cleared.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
