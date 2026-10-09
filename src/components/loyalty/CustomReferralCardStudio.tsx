/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Flame, 
  Crown, 
  RotateCcw, 
  Copy, 
  Check, 
  Share2, 
  QrCode, 
  ShieldCheck, 
  Palette, 
  Layers, 
  Wand2, 
  Sliders, 
  X, 
  Save, 
  Eye,
  Zap,
  Award
} from 'lucide-react';
import { 
  CustomCardConfig, 
  CardArtStyle, 
  CardHouse, 
  CardVisualEffect, 
  DEFAULT_CUSTOM_CARD_CONFIG 
} from '../../types/loyalty';
import { generateQRCodeDataUrl } from '../../lib/qrCodeGenerator';
import { saveUserCustomCard } from '../../lib/loyaltyService';
import { User } from '../../types';

interface CustomReferralCardStudioProps {
  user: User;
  referralCode: string;
  initialConfig?: CustomCardConfig;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (newConfig: CustomCardConfig) => void;
}

export const ART_STYLES: { id: CardArtStyle; name: string; tag: string; description: string; previewBg: string; border: string }[] = [
  {
    id: 'royal_gold',
    name: '24K Royal Gold Leaf',
    tag: 'Classic Sovereign',
    description: 'Black velvet obsidian with 24K pure gold filigree borders and gold foil damask.',
    previewBg: 'from-amber-950 via-stone-950 to-black',
    border: 'border-amber-400'
  },
  {
    id: 'cyber_tandoor',
    name: 'Cyberpunk Tandoor',
    tag: 'Neon Foundry',
    description: 'Dark brushed titanium with laser cyan & burning magenta neon fireline accents.',
    previewBg: 'from-cyan-950 via-slate-950 to-purple-950',
    border: 'border-cyan-400'
  },
  {
    id: 'charcoal_noir',
    name: 'Charcoal Noir',
    tag: 'Smoked Obsidian',
    description: 'Matte charcoal slate with delicate rose gold foil inlays and subtle smoke.',
    previewBg: 'from-stone-900 via-neutral-950 to-black',
    border: 'border-rose-400'
  },
  {
    id: 'bhatti_magma',
    name: 'Volcanic Magma',
    tag: 'Living Flame',
    description: 'Deep molten lava gradient with glowing amber fissures and fiery heat aura.',
    previewBg: 'from-red-950 via-orange-950 to-black',
    border: 'border-orange-500'
  },
  {
    id: 'imperial_jade',
    name: 'Imperial Mughal Jade',
    tag: 'Court Aristocracy',
    description: 'Royal green emerald stone with polished brass arabesque filigree and emerald jewels.',
    previewBg: 'from-emerald-950 via-stone-950 to-black',
    border: 'border-emerald-400'
  },
  {
    id: 'terracotta_dum',
    name: 'Vedic Terracotta',
    tag: 'Earthen Handi',
    description: 'Baked earthenware clay texture with rustic hammered brass corner studs.',
    previewBg: 'from-amber-900 via-stone-900 to-amber-950',
    border: 'border-amber-600'
  }
];

export const HOUSES: { id: CardHouse; name: string; symbol: string; title: string; motto: string; color: string }[] = [
  {
    id: 'spades',
    name: 'House of Spades (Hukm)',
    symbol: '♠',
    title: 'The Handi Dum Sovereigns',
    motto: 'Slow cooked over embers, shared with kings.',
    color: 'text-amber-400'
  },
  {
    id: 'hearts',
    name: 'House of Hearts (Paan)',
    symbol: '♥',
    title: 'The Dum Biryani Keepers',
    motto: 'Infused with saffron, sealed in love.',
    color: 'text-rose-400'
  },
  {
    id: 'diamonds',
    name: 'House of Diamonds (Eent)',
    symbol: '♦',
    title: 'The Charcoal Grill Titans',
    motto: 'Forged in scalding iron and white-hot coals.',
    color: 'text-amber-300'
  },
  {
    id: 'clubs',
    name: 'House of Clubs (Chidiya)',
    symbol: '♣',
    title: 'The Tandoori Royalists',
    motto: 'Clay-baked perfection in every bite.',
    color: 'text-emerald-400'
  }
];

export const VISUAL_EFFECTS: { id: CardVisualEffect; name: string; desc: string; icon: any }[] = [
  { id: 'holographic', name: 'Holo Rainbow Sheen', desc: 'Dynamic rainbow sheen angle shift', icon: Sparkles },
  { id: 'ember_particles', name: 'Floating Ember Sparks', desc: 'Fiery glowing sparks rising from coals', icon: Flame },
  { id: 'gold_glint', name: 'Reflective Light Sweep', desc: 'Periodic metallic glint across surface', icon: Zap },
  { id: 'smoke_aura', name: 'Charcoal Smoke Wisps', desc: 'Subtle curling tendrils of handi smoke', icon: Layers },
  { id: 'neon_pulse', name: 'Thermal Heat Rim Pulse', desc: 'Breathing neon glow around card perimeter', icon: Crown },
  { id: 'none', name: 'Minimalist Clean', desc: 'Pure unembellished royal card surface', icon: ShieldCheck }
];

export const TITLE_SUGGESTIONS = [
  'Nawab of Bhatti',
  'Grand Tandoor Knight',
  'Sultan of Spice',
  'Dum Biryani Sovereign',
  'Handi Alchemist',
  'Royal Charcoal Master',
  'Feast Baron'
];

export const QUOTE_SUGGESTIONS = [
  'Slow cooked over embers, shared with kings.',
  'Where woodfire smoke meets royal heritage.',
  'Feast like a Nawab, live with flavor.',
  'Sealed in clay, crowned with saffron.',
  'Good food takes time, great food takes embers.'
];

export default function CustomReferralCardStudio({
  user,
  referralCode,
  initialConfig,
  isOpen,
  onClose,
  onSaved
}: CustomReferralCardStudioProps) {
  const [config, setConfig] = useState<CustomCardConfig>(() => {
    return initialConfig || {
      ...DEFAULT_CUSTOM_CARD_CONFIG,
      patronTitle: user?.name ? `Nawab ${user.name.split(' ')[0]}` : 'Nawab of Bhatti',
      serialNumber: `#TB-${Math.floor(1000 + Math.random() * 9000)} • HERITAGE DECK`
    };
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeCustomTab, setActiveCustomTab] = useState<'style' | 'house' | 'effect' | 'identity'>('style');

  // Parallax angle for holographic effect
  const [holoAngle, setHoloAngle] = useState(45);
  const cardRef = useRef<HTMLDivElement>(null);

  // Generate QR code encoding signup referral link
  const signupReferralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?ref=${referralCode}&mode=signup`
    : `https://taashbhatti.com/?ref=${referralCode}&mode=signup`;

  useEffect(() => {
    if (referralCode) {
      generateQRCodeDataUrl(signupReferralUrl, {
        width: 320,
        margin: 1,
        color: { dark: '#121820', light: '#ffffff' }
      }).then((url) => setQrDataUrl(url));
    }
  }, [referralCode, signupReferralUrl]);

  // Mouse move for holographic angle shift
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || config.visualEffect !== 'holographic') return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const angle = Math.atan2(y - rect.height / 2, x - rect.width / 2) * (180 / Math.PI) + 180;
    setHoloAngle(Math.round(angle));
  };

  const handleCopyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    const userId = user?.id || (user as any)?.uid || '';
    await saveUserCustomCard(userId, config);
    setSaving(false);
    setSaveSuccess(true);
    onSaved?.(config);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  const currentHouse = HOUSES.find((h) => h.id === config.house) || HOUSES[0];
  const currentStyle = ART_STYLES.find((s) => s.id === config.artStyle) || ART_STYLES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-stone-950 border border-amber-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-100">
        
        {/* Studio Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-gradient-to-r from-amber-950/40 via-stone-900/50 to-stone-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wide text-amber-300 uppercase">Taash Royal Card Atelier</h3>
              <p className="text-xs text-stone-400">Handcraft your personalized 5:7 royal referral pass</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-900 border border-stone-700 hover:border-amber-400 flex items-center justify-center text-stone-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Studio Body: Split View (Live 5:7 Card on Left, Atelier Controls on Right) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: LIVE 5:7 CARD PREVIEW (Strict 5:7 Aspect Ratio) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            
            {/* Card Flip Controls Top */}
            <div className="w-full flex items-center justify-between mb-3 px-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400/80 font-bold flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                <span>5:7 Royale Ratio</span>
              </span>
              <button
                type="button"
                onClick={() => setIsFlipped(!isFlipped)}
                className="text-[11px] font-bold text-stone-300 hover:text-amber-300 bg-stone-900/90 border border-stone-700 hover:border-amber-500/50 px-3 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>{isFlipped ? 'Show Front Face' : 'Show Back (QR Pass)'}</span>
              </button>
            </div>

            {/* 3D FLIP CONTAINER: STRICT 5:7 ASPECT RATIO */}
            <div
              className="relative w-[280px] sm:w-[300px] aspect-[5/7] cursor-pointer select-none group"
              style={{ perspective: '1200px' }}
              onClick={() => setIsFlipped(!isFlipped)}
              onMouseMove={handleMouseMove}
              ref={cardRef}
            >
              <div
                className="w-full h-full relative transition-transform duration-700 ease-out"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                
                {/* ============================================================ */}
                {/* FRONT FACE (5:7 STRICT RATIO) */}
                {/* ============================================================ */}
                <div
                  className={`absolute inset-0 w-full h-full rounded-2xl border-2 p-4 flex flex-col justify-between overflow-hidden shadow-2xl transition-all ${
                    config.artStyle === 'royal_gold' ? 'bg-gradient-to-br from-stone-950 via-amber-950/60 to-black border-amber-400/80 shadow-amber-500/20' :
                    config.artStyle === 'cyber_tandoor' ? 'bg-gradient-to-br from-slate-950 via-cyan-950/70 to-purple-950 border-cyan-400 shadow-cyan-500/20' :
                    config.artStyle === 'charcoal_noir' ? 'bg-gradient-to-br from-neutral-950 via-stone-900 to-black border-rose-300/70 shadow-rose-500/15' :
                    config.artStyle === 'bhatti_magma' ? 'bg-gradient-to-br from-stone-950 via-red-950/80 to-amber-950 border-orange-500 shadow-orange-500/25' :
                    config.artStyle === 'imperial_jade' ? 'bg-gradient-to-br from-stone-950 via-emerald-950/70 to-black border-emerald-400/80 shadow-emerald-500/20' :
                    'bg-gradient-to-br from-stone-950 via-amber-900/50 to-stone-900 border-amber-600 shadow-amber-600/20'
                  }`}
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  {/* EFFECT: HOLOGRAPHIC SHEEN OVERLAY */}
                  {config.visualEffect === 'holographic' && (
                    <div
                      className="absolute inset-0 pointer-events-none opacity-40 mix-blend-color-dodge transition-opacity duration-300"
                      style={{
                        background: `linear-gradient(${holoAngle}deg, rgba(255,0,128,0.3) 0%, rgba(0,255,200,0.4) 25%, rgba(255,215,0,0.5) 50%, rgba(138,43,226,0.3) 75%, rgba(255,0,128,0.3) 100%)`
                      }}
                    />
                  )}

                  {/* EFFECT: GOLD GLINT SWEEP */}
                  {config.visualEffect === 'gold_glint' && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      <div className="w-[200%] h-full bg-gradient-to-r from-transparent via-amber-200/25 to-transparent -skew-x-45 animate-pulse" />
                    </div>
                  )}

                  {/* EFFECT: NEON HEAT PULSE */}
                  {config.visualEffect === 'neon_pulse' && (
                    <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/40 animate-ping pointer-events-none opacity-30" />
                  )}

                  {/* EFFECT: EMBER SPARKS PARTICLES */}
                  {config.visualEffect === 'ember_particles' && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      <div className="absolute bottom-2 left-6 w-1.5 h-1.5 rounded-full bg-amber-400 blur-[0.5px] animate-bounce" />
                      <div className="absolute bottom-5 right-8 w-1 h-1 rounded-full bg-orange-400 blur-[0.5px] animate-pulse" />
                      <div className="absolute bottom-10 left-1/2 w-1.5 h-1.5 rounded-full bg-amber-300 blur-[0.5px] animate-ping" />
                    </div>
                  )}

                  {/* Top Header Corner Pips: Rank & Suit */}
                  <div className="relative z-10 flex items-start justify-between">
                    <div className="flex flex-col items-center leading-none">
                      <span className="font-serif text-2xl font-black text-amber-300 tracking-tighter">A</span>
                      <span className={`text-base ${currentHouse.color}`}>{currentHouse.symbol}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-mono tracking-widest text-amber-400/90 block font-bold uppercase">
                        {config.serialNumber}
                      </span>
                      <span className="text-[10px] text-stone-400 font-semibold tracking-wide">
                        {currentHouse.name.split('(')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Center Emblem: House Sigil & Crown */}
                  <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center px-2">
                    <div className="relative mb-2">
                      <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-400/40 flex items-center justify-center shadow-lg">
                        <span className={`text-3xl ${currentHouse.color}`}>{currentHouse.symbol}</span>
                      </div>
                      <Crown className="w-4 h-4 text-amber-400 absolute -top-2 left-1/2 -translate-x-1/2" />
                    </div>

                    <h4 className="text-sm font-black tracking-wider text-amber-200 uppercase font-serif">
                      {config.patronTitle || 'Nawab of Bhatti'}
                    </h4>
                    <p className="text-[12px] font-bold text-white tracking-wide mt-0.5">
                      {user?.name || 'Royal Patron'}
                    </p>

                    <p className="text-[10px] text-amber-300/80 italic mt-1.5 line-clamp-2 max-w-[210px] font-serif">
                      "{config.customQuote || currentHouse.motto}"
                    </p>

                    {/* FRONT QR THUMBNAIL (if showQrOnFront enabled) */}
                    {config.showQrOnFront && qrDataUrl && (
                      <div className="mt-2 p-1 bg-white rounded-lg shadow-md">
                        <img src={qrDataUrl} alt="Referral QR" className="w-14 h-14 object-contain" />
                      </div>
                    )}
                  </div>

                  {/* Bottom Strip: Permanent Code & Inverted Corner Pip */}
                  <div className="relative z-10 pt-2 border-t border-amber-500/30 flex items-end justify-between">
                    <div>
                      <span className="text-[8px] font-mono text-stone-400 uppercase tracking-wider block">Invite Code</span>
                      <span className="text-sm font-mono font-black text-amber-300 tracking-wider">
                        {referralCode || 'TB-ROYAL'}
                      </span>
                    </div>
                    <div className="flex flex-col items-center leading-none rotate-180">
                      <span className="font-serif text-2xl font-black text-amber-300 tracking-tighter">A</span>
                      <span className={`text-base ${currentHouse.color}`}>{currentHouse.symbol}</span>
                    </div>
                  </div>

                  {/* Tap to Flip Helper Tooltip */}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-stone-400/60 uppercase tracking-wider">
                    Tap to Flip ↻
                  </div>
                </div>

                {/* ============================================================ */}
                {/* BACK FACE (QR CODE INVITATION PASS - 5:7 STRICT RATIO) */}
                {/* ============================================================ */}
                <div
                  className="absolute inset-0 w-full h-full rounded-2xl border-2 border-amber-400/80 p-5 flex flex-col justify-between overflow-hidden shadow-2xl bg-gradient-to-br from-stone-950 via-amber-950/70 to-black"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  {/* Top Crest */}
                  <div className="text-center">
                    <div className="inline-flex items-center gap-1 text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>Taash Bhatti Royal Pass</span>
                    </div>
                    <p className="text-[11px] text-stone-300 font-semibold mt-1">Scan for ₹150 OFF Inaugural Feast</p>
                  </div>

                  {/* Centered QR Code with Spade Emblem */}
                  <div className="my-auto flex flex-col items-center justify-center">
                    <div className="p-2.5 bg-white rounded-2xl shadow-xl border border-amber-400/50 relative group/qr">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="Referral QR Code" className="w-36 h-36 object-contain rounded-xl" />
                      ) : (
                        <div className="w-36 h-36 bg-stone-100 flex items-center justify-center text-stone-400 text-xs font-mono">
                          Generating QR...
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5 text-center">
                      <span className="text-[9px] font-mono text-amber-300 uppercase tracking-wider block">Scan with Any Camera</span>
                      <span className="text-xs font-mono font-black text-white bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/30 inline-block mt-0.5">
                        {referralCode}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Scan Instructions */}
                  <div className="text-center border-t border-amber-500/20 pt-2 text-[10px] text-stone-400">
                    <p>New signup accounts receive ₹150 discount automatically applied.</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Share Buttons under Preview */}
            <div className="w-[280px] sm:w-[300px] flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex-1 py-2 rounded-xl bg-stone-900 border border-stone-700 hover:border-amber-400 text-xs font-bold text-stone-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                <span>{copiedCode ? 'Copied Code!' : 'Copy Code'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const text = `🔥 Claim ₹150 OFF your first authentic clay-oven feast at Taash Bhatti!\nUse code: *${referralCode}*\nSign up here: ${signupReferralUrl}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* RIGHT: ATELIER CUSTOMIZATION TABS & OPTIONS */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {/* Atelier Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-stone-900/90 rounded-2xl border border-stone-800">
              <button
                type="button"
                onClick={() => setActiveCustomTab('style')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeCustomTab === 'style' ? 'bg-amber-500 text-stone-950 shadow-md font-black' : 'text-stone-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Artstyle</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCustomTab('house')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeCustomTab === 'house' ? 'bg-amber-500 text-stone-950 shadow-md font-black' : 'text-stone-400 hover:text-white'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>House</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCustomTab('effect')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeCustomTab === 'effect' ? 'bg-amber-500 text-stone-950 shadow-md font-black' : 'text-stone-400 hover:text-white'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Effects</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCustomTab('identity')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeCustomTab === 'identity' ? 'bg-amber-500 text-stone-950 shadow-md font-black' : 'text-stone-400 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Identity</span>
              </button>
            </div>

            {/* TAB CONTENT: ARTSTYLES (6 Visual Aesthetics) */}
            {activeCustomTab === 'style' && (
              <div className="space-y-2.5 animate-fade-in">
                <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider block">
                  Select Visual Card Material & Art Style:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ART_STYLES.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setConfig({ ...config, artStyle: style.id })}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        config.artStyle === style.id
                          ? `${style.border} bg-amber-500/10 shadow-md ring-1 ring-amber-400/40`
                          : 'border-stone-800 bg-stone-900/60 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-amber-200">{style.name}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-300">
                          {style.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-snug">{style.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: HOUSES (4 Bhatti Royal Houses) */}
            {activeCustomTab === 'house' && (
              <div className="space-y-2.5 animate-fade-in">
                <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider block">
                  Pledge Allegiance to a Bhatti Royal House:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {HOUSES.map((house) => (
                    <button
                      key={house.id}
                      type="button"
                      onClick={() => setConfig({ ...config, house: house.id, customQuote: house.motto })}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        config.house === house.id
                          ? 'border-amber-400 bg-amber-500/10 shadow-md ring-1 ring-amber-400/40'
                          : 'border-stone-800 bg-stone-900/60 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xl ${house.color}`}>{house.symbol}</span>
                        <div>
                          <h5 className="text-xs font-black text-white">{house.name}</h5>
                          <span className="text-[10px] text-amber-400 font-semibold">{house.title}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-stone-400 italic mt-1 font-serif">"{house.motto}"</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: VISUAL EFFECTS & SHADERS */}
            {activeCustomTab === 'effect' && (
              <div className="space-y-2.5 animate-fade-in">
                <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider block">
                  Choose Dynamic Surface Effects & Particle Shaders:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {VISUAL_EFFECTS.map((fx) => {
                    const IconComp = fx.icon;
                    return (
                      <button
                        key={fx.id}
                        type="button"
                        onClick={() => setConfig({ ...config, visualEffect: fx.id })}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                          config.visualEffect === fx.id
                            ? 'border-amber-400 bg-amber-500/10 shadow-md ring-1 ring-amber-400/40'
                            : 'border-stone-800 bg-stone-900/60 hover:border-stone-700'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-xl bg-stone-800 flex items-center justify-center text-amber-400 shrink-0">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-amber-200 block">{fx.name}</span>
                          <span className="text-[10px] text-stone-400 leading-snug">{fx.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: IDENTITY (Patron Title & Quote) */}
            {activeCustomTab === 'identity' && (
              <div className="space-y-4 animate-fade-in">
                {/* Patron Title Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-300 block">Patron Moniker / Royal Title</label>
                  <input
                    type="text"
                    value={config.patronTitle}
                    onChange={(e) => setConfig({ ...config, patronTitle: e.target.value })}
                    placeholder="e.g. Nawab of Bhatti"
                    className="w-full bg-stone-900 border border-stone-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {TITLE_SUGGESTIONS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setConfig({ ...config, patronTitle: t })}
                        className="text-[10px] font-semibold bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-800 rounded-lg px-2 py-0.5 transition-all cursor-pointer"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Quote / Motto Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-300 block">House Motto / Personal Quote</label>
                  <input
                    type="text"
                    value={config.customQuote || ''}
                    onChange={(e) => setConfig({ ...config, customQuote: e.target.value })}
                    placeholder="e.g. Slow cooked over embers, shared with kings."
                    className="w-full bg-stone-900 border border-stone-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-serif italic"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {QUOTE_SUGGESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setConfig({ ...config, customQuote: q })}
                        className="text-[10px] text-stone-400 hover:text-amber-300 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg px-2 py-0.5 transition-all cursor-pointer truncate max-w-full"
                      >
                        "{q}"
                      </button>
                    ))}
                  </div>
                </div>

                {/* Show QR on Front Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-900/80 border border-stone-800">
                  <div>
                    <span className="text-xs font-bold text-stone-200 block">Show QR Mini-Pass on Front</span>
                    <span className="text-[10px] text-stone-400">Display mini QR directly on the front face of the card</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.showQrOnFront}
                    onChange={(e) => setConfig({ ...config, showQrOnFront: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Bottom Save & Apply Actions */}
            <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setConfig(DEFAULT_CUSTOM_CARD_CONFIG)}
                className="text-xs text-stone-400 hover:text-white px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 transition-all cursor-pointer font-semibold"
              >
                Reset Defaults
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-black tracking-wide flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-stone-950" />
                      <span>Card Saved!</span>
                    </>
                  ) : saving ? (
                    <span>Minting Pass...</span>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Card Style</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

export function CustomReferralCardView({
  user,
  referralCode,
  config,
  onOpenStudio,
  className = ''
}: {
  user: User;
  referralCode: string;
  config: CustomCardConfig;
  onOpenStudio?: () => void;
  className?: string;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [holoAngle, setHoloAngle] = useState(45);
  const cardRef = useRef<HTMLDivElement>(null);

  const signupReferralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?ref=${referralCode}&mode=signup`
    : `https://taashbhatti.com/?ref=${referralCode}&mode=signup`;

  useEffect(() => {
    if (referralCode) {
      generateQRCodeDataUrl(signupReferralUrl, {
        width: 320,
        margin: 1,
        color: { dark: '#121820', light: '#ffffff' }
      }).then((url) => setQrDataUrl(url));
    }
  }, [referralCode, signupReferralUrl]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || config.visualEffect !== 'holographic') return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const angle = Math.atan2(y - rect.height / 2, x - rect.width / 2) * (180 / Math.PI) + 180;
    setHoloAngle(Math.round(angle));
  };

  const currentHouse = HOUSES.find((h) => h.id === config.house) || HOUSES[0];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Aspect Ratio 5:7 Card */}
      <div
        className="relative w-[280px] sm:w-[320px] aspect-[5/7] cursor-pointer select-none group shadow-2xl rounded-2xl"
        style={{ perspective: '1200px' }}
        onClick={() => setIsFlipped(!isFlipped)}
        onMouseMove={handleMouseMove}
        ref={cardRef}
      >
        <div
          className="w-full h-full relative transition-transform duration-700 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* Front Face (5:7) */}
          <div
            className={`absolute inset-0 w-full h-full rounded-2xl border-2 p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-2xl transition-all ${
              config.artStyle === 'royal_gold' ? 'bg-gradient-to-br from-stone-950 via-amber-950/60 to-black border-amber-400/80 shadow-amber-500/20' :
              config.artStyle === 'cyber_tandoor' ? 'bg-gradient-to-br from-slate-950 via-cyan-950/70 to-purple-950 border-cyan-400 shadow-cyan-500/20' :
              config.artStyle === 'charcoal_noir' ? 'bg-gradient-to-br from-neutral-950 via-stone-900 to-black border-rose-300/70 shadow-rose-500/15' :
              config.artStyle === 'bhatti_magma' ? 'bg-gradient-to-br from-stone-950 via-red-950/80 to-amber-950 border-orange-500 shadow-orange-500/25' :
              config.artStyle === 'imperial_jade' ? 'bg-gradient-to-br from-stone-950 via-emerald-950/70 to-black border-emerald-400/80 shadow-emerald-500/20' :
              'bg-gradient-to-br from-stone-950 via-amber-900/50 to-stone-900 border-amber-600 shadow-amber-600/20'
            }`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            {config.visualEffect === 'holographic' && (
              <div
                className="absolute inset-0 pointer-events-none opacity-40 mix-blend-color-dodge transition-opacity duration-300"
                style={{
                  background: `linear-gradient(${holoAngle}deg, rgba(255,0,128,0.3) 0%, rgba(0,255,200,0.4) 25%, rgba(255,215,0,0.5) 50%, rgba(138,43,226,0.3) 75%, rgba(255,0,128,0.3) 100%)`
                }}
              />
            )}
            {config.visualEffect === 'gold_glint' && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="w-[200%] h-full bg-gradient-to-r from-transparent via-amber-200/25 to-transparent -skew-x-45 animate-pulse" />
              </div>
            )}
            {config.visualEffect === 'neon_pulse' && (
              <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/40 animate-ping pointer-events-none opacity-30" />
            )}
            {config.visualEffect === 'ember_particles' && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute bottom-2 left-6 w-1.5 h-1.5 rounded-full bg-amber-400 blur-[0.5px] animate-bounce" />
                <div className="absolute bottom-5 right-8 w-1 h-1 rounded-full bg-orange-400 blur-[0.5px] animate-pulse" />
                <div className="absolute bottom-10 left-1/2 w-1.5 h-1.5 rounded-full bg-amber-300 blur-[0.5px] animate-ping" />
              </div>
            )}

            {/* Top Bar */}
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex flex-col items-center leading-none">
                <span className="font-serif text-2xl font-black text-amber-300 tracking-tighter">A</span>
                <span className={`text-base ${currentHouse.color}`}>{currentHouse.symbol}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono tracking-widest text-amber-400/90 block font-bold uppercase">
                  {config.serialNumber}
                </span>
                <span className="text-[10px] text-stone-400 font-semibold tracking-wide">
                  {currentHouse.name.split('(')[0]}
                </span>
              </div>
            </div>

            {/* Center Area */}
            <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center px-2">
              <div className="relative mb-2">
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-amber-500/10 border border-amber-400/40 flex items-center justify-center shadow-lg">
                  <span className={`text-3xl sm:text-4xl ${currentHouse.color}`}>{currentHouse.symbol}</span>
                </div>
                <Crown className="w-4 h-4 text-amber-400 absolute -top-2 left-1/2 -translate-x-1/2" />
              </div>

              <h4 className="text-sm sm:text-base font-black tracking-wider text-amber-200 uppercase font-serif">
                {config.patronTitle || 'Nawab of Bhatti'}
              </h4>
              <p className="text-[13px] font-bold text-white tracking-wide mt-0.5">
                {user?.name || 'Royal Patron'}
              </p>

              <p className="text-[11px] text-amber-300/80 italic mt-1.5 line-clamp-2 max-w-[220px] font-serif">
                "{config.customQuote || currentHouse.motto}"
              </p>

              {config.showQrOnFront && qrDataUrl && (
                <div className="mt-2.5 p-1 bg-white rounded-lg shadow-md">
                  <img src={qrDataUrl} alt="Referral QR" className="w-14 h-14 object-contain" />
                </div>
              )}
            </div>

            {/* Bottom Bar */}
            <div className="relative z-10 pt-2 border-t border-amber-500/30 flex items-end justify-between">
              <div>
                <span className="text-[8px] font-mono text-stone-400 uppercase tracking-wider block">Invite Code</span>
                <span className="text-sm sm:text-base font-mono font-black text-amber-300 tracking-wider">
                  {referralCode || 'TB-ROYAL'}
                </span>
              </div>
              <div className="flex flex-col items-center leading-none rotate-180">
                <span className="font-serif text-2xl font-black text-amber-300 tracking-tighter">A</span>
                <span className={`text-base ${currentHouse.color}`}>{currentHouse.symbol}</span>
              </div>
            </div>

            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-stone-400/60 uppercase tracking-wider">
              Tap to Flip ↻
            </div>
          </div>

          {/* Back Face (5:7 QR Code Pass) */}
          <div
            className="absolute inset-0 w-full h-full rounded-2xl border-2 border-amber-400/80 p-5 flex flex-col justify-between overflow-hidden shadow-2xl bg-gradient-to-br from-stone-950 via-amber-950/70 to-black text-white"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="text-center">
              <div className="inline-flex items-center gap-1 text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                <Crown className="w-3 h-3 text-amber-400" />
                <span>Taash Bhatti Royal Pass</span>
              </div>
              <p className="text-[11px] text-stone-300 font-semibold mt-1">Scan for ₹150 OFF Inaugural Feast</p>
            </div>

            <div className="my-auto flex flex-col items-center justify-center">
              <div className="p-2.5 bg-white rounded-2xl shadow-xl border border-amber-400/50">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Referral QR Code" className="w-36 h-36 sm:w-40 sm:h-40 object-contain rounded-xl" />
                ) : (
                  <div className="w-36 h-36 sm:w-40 sm:h-40 bg-stone-100 flex items-center justify-center text-stone-400 text-xs font-mono">
                    Generating QR...
                  </div>
                )}
              </div>

              <div className="mt-2.5 text-center">
                <span className="text-[9px] font-mono text-amber-300 uppercase tracking-wider block">Scan to Auto-Fill Signup Code</span>
                <span className="text-xs font-mono font-black text-white bg-amber-500/20 px-2.5 py-0.5 rounded border border-amber-400/30 inline-block mt-0.5">
                  {referralCode}
                </span>
              </div>
            </div>

            <div className="text-center border-t border-amber-500/20 pt-2 text-[10px] text-stone-400">
              <p>Sign-up exclusive discount. Valid on first order of ₹399+.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons Under Card */}
      <div className="w-[280px] sm:w-[320px] flex items-center gap-2 mt-3.5">
        <button
          type="button"
          onClick={() => setIsFlipped(!isFlipped)}
          className="flex-1 py-2 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-400/50 text-xs font-bold text-stone-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>{isFlipped ? 'Show Front' : 'Show QR'}</span>
        </button>

        {onOpenStudio && (
          <button
            type="button"
            onClick={onOpenStudio}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 hover:border-amber-400 text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span>Customize</span>
          </button>
        )}
      </div>
    </div>
  );
}
