/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import PhoneAuthComponent from './PhoneAuthComponent';
import { User } from '../types';

interface PhoneAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userData: { user: User; fbUser: any; isNewUser: boolean }) => void;
  title?: string;
  subtitle?: string;
}

export default function PhoneAuthModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Mobile Number Sign-In",
  subtitle = "Instant OTP Verification for seamless dining and quick reordering",
}: PhoneAuthModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl border border-brand-green/15 shadow-2xl overflow-hidden relative animate-scale-up">
        {/* Modal Top Bar */}
        <div className="px-6 pt-5 pb-3 border-b border-brand-green/5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-brand-charcoal tracking-tight flex items-center gap-1.5">
              <span>{title}</span>
            </h3>
            <p className="text-[11px] text-brand-charcoal/60 mt-0.5">
              {subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-brand-cream/50 text-brand-charcoal/60 hover:text-brand-charcoal hover:bg-brand-cream flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <PhoneAuthComponent
            onSuccess={(data) => {
              onSuccess(data);
              onClose();
            }}
            onCancel={onClose}
          />
        </div>

        {/* Modal Footer Security Badge */}
        <div className="px-6 py-3 bg-brand-cream/15 border-t border-brand-green/5 flex items-center justify-center gap-1 text-[10px] text-brand-charcoal/50 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-green" />
          <span>TAASH BHATTI Cloud Security • Encrypted One-Time Passcode</span>
        </div>
      </div>
    </div>
  );
}
