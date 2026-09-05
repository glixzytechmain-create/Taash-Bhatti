import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Lock, AlertOctagon, Flame, Mail, RefreshCw } from 'lucide-react';
import { User } from '../types';

interface BannedAccountOverlayProps {
  user: User;
}

export default function BannedAccountOverlay({ user }: BannedAccountOverlayProps) {
  const bannedReason = user.bannedReason || 'Account suspended by FitZaika Security Administration due to policy violation or security verification lock.';
  const bannedDate = user.bannedAt ? new Date(user.bannedAt).toLocaleString() : new Date().toLocaleString();

  return (
    <div className="fixed inset-0 z-[999999] bg-[#07090C] text-white flex flex-col items-center justify-center p-4 overflow-hidden select-none">
      {/* Animated Matrix/Grid Background FX */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(225,29,72,0.15)_0%,_transparent_70%)] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(244, 63, 94, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(244, 63, 94, 0.3) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative z-10 max-w-lg w-full bg-[#0F1318] border-2 border-rose-600/60 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(225,29,72,0.35)] space-y-6 text-center"
      >
        {/* Pulsing Security Shield Icon */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-rose-600/20 animate-ping opacity-75" />
          <div className="relative w-20 h-20 bg-rose-950/80 border-2 border-rose-500 text-rose-500 rounded-3xl flex items-center justify-center shadow-xl">
            <ShieldAlert className="w-10 h-10 animate-pulse" />
          </div>
        </div>

        {/* Warning Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/90 border border-rose-600/40 text-rose-400 font-mono font-black text-[10px] uppercase tracking-widest shadow-inner">
            <Lock className="w-3 h-3" /> SECURITY FIREWALL BLOCKADE
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight">
            ACCOUNT <span className="text-rose-500">TEMPORARILY BANNED</span>
          </h2>
          <p className="text-xs text-rose-300/80 font-medium max-w-md mx-auto">
            An active firewall isolation rule has been applied to this profile. Access to all app services, routes, cart, and orders is strictly prohibited.
          </p>
        </div>

        {/* Account Details & Ban Reason Card */}
        <div className="bg-[#151B22] border border-rose-900/40 rounded-2xl p-4 text-left space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-rose-900/20">
            <span className="text-gray-400 font-bold uppercase text-[10px]">Target Account:</span>
            <span className="text-white font-bold">{user.name || 'User'}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-rose-900/20">
            <span className="text-gray-400 font-bold uppercase text-[10px]">Email Address:</span>
            <span className="text-rose-300 font-bold">{user.email || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-rose-900/20">
            <span className="text-gray-400 font-bold uppercase text-[10px]">Quarantine Initiated:</span>
            <span className="text-gray-300">{bannedDate}</span>
          </div>
          
          <div className="pt-1">
            <span className="text-rose-400 font-bold uppercase text-[10px] block mb-1">
              Official Ban Reason / Notes:
            </span>
            <div className="bg-[#0A0D10] border border-rose-900/30 rounded-xl p-3 text-rose-200 text-[11px] leading-relaxed font-sans">
              "{bannedReason}"
            </div>
          </div>
        </div>

        {/* Firewall Restrictions Notice */}
        <div className="bg-rose-950/30 border border-rose-800/20 rounded-2xl p-3 text-left flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-300 leading-normal">
            <strong className="text-rose-400 uppercase">UNBYPASSABLE FIREWALL RULE:</strong> This session is isolated at the security layer. Account switching, logout bypass, or route manipulation is deactivated until administration lifts the ban.
          </p>
        </div>

        {/* Contact Compliance Support */}
        <div className="pt-2 border-t border-rose-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-gray-400">
          <div className="flex items-center gap-1.5 text-gray-300">
            <Mail className="w-3.5 h-3.5 text-rose-400" />
            <span>Appeal: <strong className="text-white font-mono">compliance@fitzaika.com</strong></span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 bg-rose-900/30 hover:bg-rose-900/50 text-rose-300 border border-rose-700/40 rounded-xl font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 animate-spin" /> Check Status
          </button>
        </div>
      </motion.div>
    </div>
  );
}
