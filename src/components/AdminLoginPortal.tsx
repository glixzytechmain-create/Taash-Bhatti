/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, ArrowLeft, KeyRound, AlertCircle, Mail, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AdminLoginPortalProps {
  email?: string;
  onVerify: () => void;
  onCancel: () => void;
}

export default function AdminLoginPortal({ email: initialEmail = '', onVerify, onCancel }: AdminLoginPortalProps) {
  const [adminEmail, setAdminEmail] = useState(initialEmail || '');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const emailClean = adminEmail.trim().toLowerCase();
    const passClean = adminPassword.trim();

    if (!emailClean || !passClean) {
      setError('Please provide both administrator email and password.');
      setLoading(false);
      return;
    }

    try {
      // Direct authentic Firebase Authentication verification
      await signInWithEmailAndPassword(auth, emailClean, passClean);
      onVerify();
    } catch (err: any) {
      console.warn("Admin portal auth error:", err?.code || err?.message);
      let friendlyError = "Invalid administrator credentials. Access Denied.";
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyError = "Incorrect administrator password. Please try again.";
      } else if (err.code === 'auth/user-not-found') {
        friendlyError = "No administrator account registered with this email.";
      } else if (err.code === 'auth/too-many-requests') {
        friendlyError = "Too many failed attempts. Please wait a few moments.";
      }
      setError(friendlyError);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-charcoal text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,107,0,0.1)_0%,transparent_70%)] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-[#12181E] border border-brand-green/20 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        <div className="text-center space-y-3 mb-6">
          <div className="w-16 h-16 bg-white border border-brand-orange/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner p-1 overflow-hidden">
            <img src="https://cdn.postimage.me/2026/08/01/28172.png" alt="TAASH BHATTI Logo" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-widest text-white">
              TAASH BHATTI Admin Console
            </h2>
            <p className="text-[10px] uppercase font-bold text-brand-green tracking-wider mt-1">
              🔒 SECURED FIREBASE AUTHENTICATED GATEWAY
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
              Administrator Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                required
                placeholder="admin@taashbhatti.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl pl-10 pr-4 py-3 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-brand-green"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
              Account Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl pl-10 pr-4 py-3 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-brand-green"
              />
            </div>
          </div>

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

          <button
            type="submit"
            disabled={loading || !adminPassword.trim() || !adminEmail.trim()}
            className="w-full bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer shadow-lg mt-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-brand-charcoal border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>VERIFY CREDENTIALS & SIGN IN ➜</span>
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-brand-green/10" />
          </div>
          <div className="relative flex justify-center text-[9px] uppercase font-bold text-gray-500">
            <span className="bg-[#12181E] px-2">Access Control</span>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="w-full border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white transition-all font-black text-[10px] uppercase py-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> CANCEL & EXIT GATEWAY
        </button>
      </motion.div>

      <div className="mt-8 text-center space-y-1">
        <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">
          SECURITY PROTOCOL • TAASH BHATTI Inc.
        </p>
        <p className="text-[8px] text-gray-700">
          Standard Firebase Authentication with individual account encryption.
        </p>
      </div>
    </div>
  );
}
