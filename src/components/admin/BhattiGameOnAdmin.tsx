/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameConfig, GameType, GameOutcome } from '../../types/gameon';
import { 
  subscribeToAllGames, 
  saveGame, 
  deleteGame, 
  generateRandom6DigitCode 
} from '../../lib/gameonService';
import { 
  generateQRCodeDataUrl, 
  generateQRCodeSvg, 
  downloadFile 
} from '../../lib/qrCodeGenerator';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Gamepad2, 
  Plus, 
  QrCode, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Flame, 
  Check, 
  ExternalLink, 
  Download, 
  Printer, 
  X, 
  Percent, 
  Ticket, 
  Users, 
  Trophy, 
  Play 
} from 'lucide-react';

const GAME_TYPES: { type: GameType; label: string; icon: string; desc: string }[] = [
  { type: 'roulette', label: 'Bhatti Roulette', icon: '🎡', desc: 'Spin the antique wheel of flavors with wooden pegs' },
  { type: 'scratch_card', label: 'Golden Scratch Card', icon: '🎫', desc: 'Scratch away metallic gold foil with finger or mouse' },
  { type: 'coin_flip', label: 'Royal Taash Coin Toss', icon: '🪙', desc: '3D perspective coin flip: Royal Crest vs Bhatti Flame' },
  { type: 'mystery_box', label: 'Mystery Clay Handis', icon: '📦', desc: 'Pick from 3 sealed clay handis with glowing smoke' },
  { type: 'memory_match', label: 'Taash Memory Match', icon: '🃏', desc: 'Turn-based card pair matching culinary challenge' },
  { type: 'quick_quiz', label: 'Royal Bhatti Quick Quiz', icon: '⚡', desc: '3 fast-paced foodie trivia questions against clock' },
];

export default function BhattiGameOnAdmin() {
  const [games, setGames] = useState<GameConfig[]>([]);
  const [availableCoupons, setAvailableCoupons] = useState<{ id: string; code: string; discountType: string; discountValue: number }[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Creator / Editor modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameConfig | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formType, setFormType] = useState<GameType>('roulette');
  const [formGameId, setFormGameId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formMaxTurns, setFormMaxTurns] = useState(1);
  const [formOutcomes, setFormOutcomes] = useState<GameOutcome[]>([
    { id: '1', label: '50% OFF Handi Biryani', probabilityWeight: 20, isWin: true, couponCode: '', rewardDescription: 'Half price feast!' },
    { id: '2', label: 'Free Insulated Delivery', probabilityWeight: 30, isWin: true, couponCode: '', rewardDescription: 'Zero delivery fee' },
    { id: '3', label: 'Better Luck Next Time', probabilityWeight: 50, isWin: false, rewardDescription: 'Try again tomorrow' },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  // QR Modal State
  const [qrModalGame, setQrModalGame] = useState<GameConfig | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrSvgString, setQrSvgString] = useState<string>('');
  const [generatingQr, setGeneratingQr] = useState(false);

  // Subscribe to real-time games
  useEffect(() => {
    const unsub = subscribeToAllGames((list) => {
      setGames(list);
    });
    return () => unsub();
  }, []);

  // Fetch available coupons from Firestore
  useEffect(() => {
    getDocs(collection(db, 'coupons')).then((snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          code: data.code || d.id,
          discountType: data.discountType || 'percentage',
          discountValue: data.discountValue || 0,
        });
      });
      setAvailableCoupons(list);
    }).catch((e) => console.warn('Coupons fetch error:', e));
  }, []);

  // Open Creator Modal
  const handleOpenCreate = () => {
    setEditingGame(null);
    setFormTitle('Bhatti Feast ' + (GAME_TYPES.find(g => g.type === formType)?.label || 'Game'));
    setFormSubtitle('Scan at your table to unlock secret feast coupons');
    setFormType('roulette');
    setFormGameId(generateRandom6DigitCode());
    setFormIsActive(true);
    setFormMaxTurns(1);
    setFormOutcomes([
      { id: '1', label: '50% OFF Handi Biryani', probabilityWeight: 20, isWin: true, couponCode: availableCoupons[0]?.code || '', rewardDescription: 'Half price feast!' },
      { id: '2', label: 'Free Insulated Delivery', probabilityWeight: 30, isWin: true, couponCode: availableCoupons[1]?.code || '', rewardDescription: 'Zero delivery fee' },
      { id: '3', label: 'Better Luck Next Time', probabilityWeight: 50, isWin: false, rewardDescription: 'Try again tomorrow' },
    ]);
    setIsEditModalOpen(true);
  };

  // Open Editor Modal
  const handleOpenEdit = (game: GameConfig) => {
    setEditingGame(game);
    setFormTitle(game.title);
    setFormSubtitle(game.subtitle || '');
    setFormType(game.gameType);
    setFormGameId(game.gameId);
    setFormIsActive(game.isActive);
    setFormMaxTurns(game.maxTurnsPerSession || 1);
    setFormOutcomes(game.outcomes && game.outcomes.length > 0 ? [...game.outcomes] : []);
    setIsEditModalOpen(true);
  };

  // Open QR Code Modal
  const handleOpenQr = async (game: GameConfig) => {
    setQrModalGame(game);
    setGeneratingQr(true);

    const targetUrl = `${window.location.origin}/?gameon=${game.gameId}`;
    try {
      const dataUrl = await generateQRCodeDataUrl(targetUrl, { width: 500, margin: 2 });
      const svgStr = await generateQRCodeSvg(targetUrl, { width: 500, margin: 2 });
      setQrDataUrl(dataUrl);
      setQrSvgString(svgStr);
    } catch (e) {
      console.error('QR generation error:', e);
    } finally {
      setGeneratingQr(false);
    }
  };

  // Save Game Submit
  const handleSaveGameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formGameId.trim()) return;

    setIsSaving(true);
    const payload: GameConfig = {
      id: editingGame ? editingGame.id : `game_${formGameId}`,
      gameId: formGameId.trim().toUpperCase(),
      title: formTitle.trim(),
      subtitle: formSubtitle.trim(),
      gameType: formType,
      isActive: formIsActive,
      maxTurnsPerSession: Number(formMaxTurns) || 1,
      dailyLimitPerDevice: 1,
      outcomes: formOutcomes,
      totalPlays: editingGame ? editingGame.totalPlays : 0,
      totalWins: editingGame ? editingGame.totalWins : 0,
      createdAt: editingGame ? editingGame.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = await saveGame(payload);
    setIsSaving(false);
    if (res.success) {
      setIsEditModalOpen(false);
    } else {
      alert('Error saving game: ' + res.error);
    }
  };

  // Delete Game
  const handleDeleteGame = async (game: GameConfig) => {
    if (confirm(`Are you sure you want to delete "${game.title}" (ID #${game.gameId})? This will retire this permanent QR code.`)) {
      await deleteGame(game.id);
    }
  };

  // Toggle Active
  const handleToggleActive = async (game: GameConfig) => {
    await saveGame({
      ...game,
      isActive: !game.isActive,
    });
  };

  // Outcome helpers
  const handleAddOutcome = () => {
    setFormOutcomes((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        label: 'Special Gourmet Treat',
        probabilityWeight: 20,
        isWin: true,
        couponCode: availableCoupons[0]?.code || '',
        rewardDescription: 'Exclusive dining perk',
      },
    ]);
  };

  const handleRemoveOutcome = (index: number) => {
    setFormOutcomes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateOutcome = (index: number, updates: Partial<GameOutcome>) => {
    setFormOutcomes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  // Filtered games
  const filteredGames = games.filter((g) => {
    const matchesType = filterType === 'all' || g.gameType === filterType;
    const matchesSearch = !searchQuery.trim() || 
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      g.gameId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#1c1917] via-[#292524] to-[#1c1917] border border-amber-500/30 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-md">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                PATRON DINING ENGAGEMENT
              </span>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Bhatti GameOn Studio</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {games.length} Games Active
                </span>
              </h2>
            </div>
          </div>
          <p className="text-xs text-stone-400 max-w-xl leading-relaxed">
            Create permanent, interactive arcade games (Roulette, Scratch Cards, Coin Flips, Mystery Handis, Memory Match, Quick Quiz) with custom win probabilities, attached coupons, and instant printable table QR standees.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer hover:scale-102 active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Game ➜</span>
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white border border-brand-green/10 rounded-2xl p-4 shadow-3xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-brand-green text-white shadow-xs'
                : 'bg-brand-cream/50 text-brand-charcoal/70 hover:text-brand-charcoal'
            }`}
          >
            All Games ({games.length})
          </button>
          {GAME_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => setFilterType(t.type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === t.type
                  ? 'bg-brand-green text-white shadow-xs'
                  : 'bg-brand-cream/50 text-brand-charcoal/70 hover:text-brand-charcoal'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by title or 6-digit ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3.5 py-1.5 bg-brand-cream/20 border border-brand-green/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-green/20 w-full sm:w-64"
        />
      </div>

      {/* GAME ROSTER GRID */}
      {filteredGames.length === 0 ? (
        <div className="p-12 text-center bg-white border border-brand-green/10 rounded-3xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Gamepad2 className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-brand-charcoal">No Games Found</h4>
          <p className="text-xs text-brand-charcoal/60 max-w-sm mx-auto">
            Click &quot;Create New Game&quot; to build your first permanent table QR game experience!
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-brand-green text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-brand-green/90"
          >
            + Create First Game
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredGames.map((g) => {
            const typeInfo = GAME_TYPES.find((t) => t.type === g.gameType);
            const winRate = g.totalPlays > 0 ? Math.round((g.totalWins / g.totalPlays) * 100) : 0;

            return (
              <div
                key={g.id}
                className="bg-white border border-brand-green/10 rounded-3xl p-5 shadow-3xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all relative overflow-hidden"
              >
                {/* Top Type & Status */}
                <div className="flex items-center justify-between border-b border-brand-green/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{typeInfo?.icon || '🎮'}</span>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-brand-green">
                        {typeInfo?.label || g.gameType}
                      </span>
                      <div className="font-mono text-xs font-extrabold text-brand-charcoal flex items-center gap-1">
                        <span>ID #{g.gameId}</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(g)}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide cursor-pointer transition-colors ${
                      g.isActive
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-stone-100 text-stone-500 border border-stone-300'
                    }`}
                  >
                    {g.isActive ? 'Active' : 'Paused'}
                  </button>
                </div>

                {/* Body Details */}
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-base font-extrabold text-brand-charcoal leading-snug">
                    {g.title}
                  </h3>
                  {g.subtitle && (
                    <p className="text-xs text-brand-charcoal/60 line-clamp-2">
                      {g.subtitle}
                    </p>
                  )}
                  <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-brand-charcoal/70">
                    <span className="px-2 py-0.5 bg-brand-cream/50 rounded-md border border-brand-green/10">
                      🎯 {g.outcomes?.length || 0} Outcomes
                    </span>
                    <span className="px-2 py-0.5 bg-brand-cream/50 rounded-md border border-brand-green/10">
                      🔄 {g.maxTurnsPerSession} Turns/Scan
                    </span>
                  </div>
                </div>

                {/* Real-time Stats */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-brand-cream/30 rounded-2xl border border-brand-green/5 text-center text-xs">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-brand-charcoal/50">Plays</div>
                    <div className="font-extrabold text-brand-charcoal">{g.totalPlays || 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-brand-charcoal/50">Wins</div>
                    <div className="font-extrabold text-brand-green">{g.totalWins || 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-brand-charcoal/50">Win Rate</div>
                    <div className="font-extrabold text-amber-600">{winRate}%</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-brand-green/5">
                  <button
                    type="button"
                    onClick={() => handleOpenQr(g)}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-400/40 text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Permanent QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(g)}
                    className="p-2 rounded-xl bg-brand-cream/50 hover:bg-brand-cream text-brand-charcoal border border-brand-green/10 transition-colors cursor-pointer"
                    title="Edit Game"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <a
                    href={`/?gameon=${g.gameId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-brand-cream/50 hover:bg-brand-cream text-brand-green border border-brand-green/10 transition-colors cursor-pointer"
                    title="Test Run In New Tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDeleteGame(g)}
                    className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors cursor-pointer"
                    title="Delete Game"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🛠️ CREATOR & EDITOR MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-brand-green/15 shadow-2xl overflow-hidden relative my-6">
            {/* Modal Header */}
            <div className="px-6 pt-5 pb-3 border-b border-brand-green/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-brand-charcoal tracking-tight">
                    {editingGame ? 'Edit Game Experience' : 'Create New Permanent Game'}
                  </h3>
                  <p className="text-[11px] text-brand-charcoal/60">
                    Configure probabilities, attached coupon codes, and turn limits
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveGameSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Game Type Picker */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-brand-charcoal/50">
                  Select Game Engine
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {GAME_TYPES.map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setFormType(t.type)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        formType === t.type
                          ? 'border-brand-green bg-brand-green/5 shadow-xs'
                          : 'border-brand-green/10 hover:border-brand-green/30 bg-white'
                      }`}
                    >
                      <div className="text-2xl">{t.icon}</div>
                      <div className="text-xs font-black text-brand-charcoal mt-1">{t.label}</div>
                      <div className="text-[9px] text-brand-charcoal/50 line-clamp-1">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & 6-Digit ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-brand-charcoal/50">
                    Game Display Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Weekend Handi Biryani Spin"
                    className="w-full bg-brand-cream/15 border border-brand-green/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-brand-charcoal/50">
                    6-Digit Game ID
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={formGameId}
                    onChange={(e) => setFormGameId(e.target.value.toUpperCase())}
                    placeholder="849201"
                    className="w-full bg-brand-cream/15 border border-brand-green/10 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                  />
                </div>
              </div>

              {/* Subtitle & Turns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-brand-charcoal/50">
                    Subtitle / Promotional Tagline
                  </label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="e.g. Scan at table to win secret feast discounts"
                    className="w-full bg-brand-cream/15 border border-brand-green/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-brand-charcoal/50">
                    Turns Allowed Per Scan
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formMaxTurns}
                    onChange={(e) => setFormMaxTurns(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-brand-cream/15 border border-brand-green/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                  />
                </div>
              </div>

              {/* OUTCOMES & PROBABILITIES MATRIX */}
              <div className="space-y-3 pt-2 border-t border-brand-green/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
                      Outcomes & Winning Probabilities
                    </h4>
                    <p className="text-[10px] text-brand-charcoal/60">
                      Configure each prize slice/outcome and attach an existing coupon code from your store.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOutcome}
                    className="px-3 py-1.5 bg-brand-cream/70 hover:bg-brand-cream text-brand-green border border-brand-green/20 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    + Add Outcome
                  </button>
                </div>

                <div className="space-y-2.5">
                  {formOutcomes.map((outcome, idx) => (
                    <div
                      key={outcome.id || idx}
                      className="p-3.5 bg-brand-cream/20 border border-brand-green/10 rounded-2xl space-y-2.5"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                        {/* Outcome Label */}
                        <div className="sm:col-span-2">
                          <label className="text-[9px] font-bold uppercase text-brand-charcoal/50 block">
                            Outcome Name
                          </label>
                          <input
                            type="text"
                            required
                            value={outcome.label}
                            onChange={(e) => handleUpdateOutcome(idx, { label: e.target.value })}
                            placeholder="e.g. 50% OFF Biryani"
                            className="w-full bg-white border border-brand-green/15 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                          />
                        </div>

                        {/* Weight */}
                        <div>
                          <label className="text-[9px] font-bold uppercase text-brand-charcoal/50 block">
                            Weight (Odds)
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={outcome.probabilityWeight}
                            onChange={(e) => handleUpdateOutcome(idx, { probabilityWeight: parseInt(e.target.value, 10) || 1 })}
                            className="w-full bg-white border border-brand-green/15 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                          />
                        </div>

                        {/* Is Win Toggle */}
                        <div>
                          <label className="text-[9px] font-bold uppercase text-brand-charcoal/50 block">
                            Type
                          </label>
                          <select
                            value={outcome.isWin ? 'win' : 'loss'}
                            onChange={(e) => handleUpdateOutcome(idx, { isWin: e.target.value === 'win' })}
                            className="w-full bg-white border border-brand-green/15 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                          >
                            <option value="win">🏆 Winner (Coupon)</option>
                            <option value="loss">💫 Try Again / No Prize</option>
                          </select>
                        </div>
                      </div>

                      {/* Coupon Attachment Dropdown (if isWin) */}
                      {outcome.isWin && (
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-brand-green/5">
                          <div className="flex-1">
                            <label className="text-[9px] font-bold uppercase text-brand-green block">
                              Attached Store Coupon (Auto-Provisioned)
                            </label>
                            <select
                              value={outcome.couponCode || ''}
                              onChange={(e) => handleUpdateOutcome(idx, { couponCode: e.target.value })}
                              className="w-full bg-white border border-brand-green/20 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-brand-charcoal focus:outline-none"
                            >
                              <option value="">-- Custom Code / No Auto Coupon --</option>
                              {availableCoupons.map((c) => (
                                <option key={c.id} value={c.code}>
                                  {c.code} ({c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`})
                                </option>
                              ))}
                            </select>
                          </div>

                          {formOutcomes.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOutcome(idx)}
                              className="p-1.5 text-red-500 hover:text-red-700 cursor-pointer shrink-0 mt-3"
                              title="Delete Outcome"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-brand-green/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 rounded-xl bg-brand-green hover:bg-brand-green/90 text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Save & Provision Game</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📱 ON-COMMAND PERMANENT QR & STANDEE MODAL */}
      {qrModalGame && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-amber-500/30 shadow-2xl overflow-hidden relative my-6 text-center">
            {/* Modal Header */}
            <div className="px-6 pt-5 pb-3 border-b border-brand-green/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-brand-charcoal tracking-tight">
                    Permanent Table QR Card
                  </h3>
                  <p className="text-[11px] text-brand-charcoal/60">
                    Game #{qrModalGame.gameId} • High-Resolution Vector Print
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQrModalGame(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* STANDEE CARD PREVIEW (What diners will see on table tent) */}
            <div className="p-6 space-y-4">
              <div id="printable-standee" className="p-6 rounded-3xl bg-gradient-to-b from-[#1c1917] via-[#292524] to-[#1c1917] border-4 border-amber-500/80 shadow-2xl space-y-4 text-center text-white">
                <div className="flex items-center justify-center gap-1.5 text-amber-400">
                  <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-black uppercase tracking-widest">
                    TAASH BHATTI • GAMEON
                  </span>
                </div>

                <h2 className="text-lg font-black tracking-tight text-white">
                  {qrModalGame.title}
                </h2>
                <p className="text-[11px] text-amber-200/80 max-w-xs mx-auto">
                  Scan with your phone camera to play and win instant feast discounts!
                </p>

                {/* QR Code Graphic */}
                <div className="w-48 h-48 sm:w-56 sm:h-56 mx-auto bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center border-2 border-amber-400">
                  {generatingQr ? (
                    <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  ) : qrDataUrl ? (
                    <img src={qrDataUrl} alt="GameOn Permanent QR" className="w-full h-full object-contain" />
                  ) : null}
                </div>

                <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                  Permanent Link: taashbhatti.com/?gameon={qrModalGame.gameId}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => downloadFile(qrDataUrl, `TaashBhatti_QR_${qrModalGame.gameId}.png`, false)}
                  className="py-2.5 px-3 rounded-xl bg-brand-cream/60 hover:bg-brand-cream text-brand-charcoal border border-brand-green/10 text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-brand-green" />
                  <span>PNG Image</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadFile(qrSvgString, `TaashBhatti_QR_${qrModalGame.gameId}.svg`, true)}
                  className="py-2.5 px-3 rounded-xl bg-brand-cream/60 hover:bg-brand-cream text-brand-charcoal border border-brand-green/10 text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600" />
                  <span>Vector SVG</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 px-3 rounded-xl bg-brand-green hover:bg-brand-green/90 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Standee</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
