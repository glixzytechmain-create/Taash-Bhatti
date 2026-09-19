/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  GameConfig, 
  GameType, 
  GameOutcome, 
  GameQuizQuestion, 
  MemoryCardPair 
} from '../../types/gameon';
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
  Play, 
  RefreshCw, 
  Copy, 
  CheckCheck, 
  HelpCircle, 
  Layers, 
  Award, 
  Shuffle, 
  ShieldCheck, 
  Coins 
} from 'lucide-react';

// Live Game Engines for the Sandbox Demo Simulator
import RouletteGame from '../gameon/games/RouletteGame';
import ScratchCardGame from '../gameon/games/ScratchCardGame';
import CoinFlipGame from '../gameon/games/CoinFlipGame';
import MysteryBoxGame from '../gameon/games/MysteryBoxGame';
import MemoryMatchGame from '../gameon/games/MemoryMatchGame';
import QuickQuizGame from '../gameon/games/QuickQuizGame';

const GAME_TYPES: { type: GameType; label: string; icon: string; desc: string; category: string }[] = [
  { type: 'coin_flip', label: 'Royal Taash Coin Toss', icon: '🪙', desc: 'Authentic 50/50 toss: Patron calls Crest vs Bhatti Flame', category: 'Fair Physical Toss' },
  { type: 'roulette', label: 'Bhatti Roulette', icon: '🎡', desc: 'Antique wheel of flavors with wooden pegs and weighted slices', category: 'Odds Wheel' },
  { type: 'scratch_card', label: 'Golden Scratch Card', icon: '🎫', desc: 'Rub away metallic gold, charcoal, or ember foil coating', category: 'Instant Scratch' },
  { type: 'mystery_box', label: 'Mystery Clay Handis', icon: '🏺', desc: 'Pick 1 of 3 or 4 sealed clay handis with glowing aromatic smoke', category: 'Pick a Handi' },
  { type: 'memory_match', label: 'Taash Memory Match', icon: '🃏', desc: 'Turn-based culinary card pair matching challenge', category: 'Skill Memory' },
  { type: 'quick_quiz', label: 'Royal Bhatti Quick Quiz', icon: '⚡', desc: '3 fast-paced foodie trivia questions against the clock', category: 'Timed Trivia' },
];

const DEFAULT_QUIZ_QUESTIONS: GameQuizQuestion[] = [
  {
    id: 'q1',
    question: 'In authentic Dum cooking, what is traditionally used to seal the clay handi lid?',
    options: ['Aluminium Foil', 'Wheat Flour Dough (Atta)', 'Silicone Gasket', 'Wax Cord'],
    correctIndex: 1,
  },
  {
    id: 'q2',
    question: 'Which royal spice gives traditional biryani its deep golden aromatic fragrance?',
    options: ['Cumin', 'Turmeric', 'Pure Kashmiri Saffron', 'Mustard Seed'],
    correctIndex: 2,
  },
  {
    id: 'q3',
    question: 'How does clay pot cooking enhance bhatti meats and gravies?',
    options: ['Retains moisture & adds earthy minerals', 'Cooks 10x faster', 'Removes all oils', 'Freezes spices'],
    correctIndex: 0,
  },
];

export default function BhattiGameOnAdmin() {
  const [games, setGames] = useState<GameConfig[]>([]);
  const [availableCoupons, setAvailableCoupons] = useState<{ id: string; code: string; discountType: string; discountValue: number }[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Creator / Editor modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameConfig | null>(null);

  // Common Form State
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formType, setFormType] = useState<GameType>('coin_flip');
  const [formGameId, setFormGameId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formMaxTurns, setFormMaxTurns] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Specialized: Standard Outcomes (Roulette, Scratch, Mystery)
  const [formOutcomes, setFormOutcomes] = useState<GameOutcome[]>([
    { id: '1', label: '50% OFF Handi Biryani', probabilityWeight: 20, isWin: true, couponCode: '', rewardDescription: 'Half price feast!' },
    { id: '2', label: 'Free Insulated Delivery', probabilityWeight: 30, isWin: true, couponCode: '', rewardDescription: 'Zero delivery fee' },
    { id: '3', label: 'Better Luck Next Time', probabilityWeight: 50, isWin: false, rewardDescription: 'Try again tomorrow' },
  ]);

  // Specialized: Coin Toss (Authentic 50/50)
  const [coinWinLabel, setCoinWinLabel] = useState('30% OFF Royal Handi Feast');
  const [coinWinCoupon, setCoinWinCoupon] = useState('');
  const [coinWinDesc, setCoinWinDesc] = useState('You called the coin toss correctly!');
  const [coinLossLabel, setCoinLossLabel] = useState('Better Luck Next Time');
  const [coinLossDesc, setCoinLossDesc] = useState('The coin landed on the opposite side. Try again next visit!');

  // Specialized: Scratch Card
  const [scratchFoilTheme, setScratchFoilTheme] = useState<'gold' | 'charcoal' | 'ember'>('gold');

  // Specialized: Mystery Box
  const [mysteryBoxCount, setMysteryBoxCount] = useState<number>(3);

  // Specialized: Memory Match
  const [memoryPairsCount, setMemoryPairsCount] = useState<number>(3);
  const [memoryMaxTurns, setMemoryMaxTurns] = useState<number>(8);
  const [memoryWinLabel, setMemoryWinLabel] = useState('Culinary Memory Champion • 25% OFF');
  const [memoryWinCoupon, setMemoryWinCoupon] = useState('');
  const [memoryWinDesc, setMemoryWinDesc] = useState('All chef secret ingredient cards matched!');

  // Specialized: Quick Quiz
  const [quizPassingScore, setQuizPassingScore] = useState<number>(2);
  const [quizQuestions, setQuizQuestions] = useState<GameQuizQuestion[]>(DEFAULT_QUIZ_QUESTIONS);
  const [quizWinLabel, setQuizWinLabel] = useState('Royal Foodie Trivia Scholar • 20% OFF');
  const [quizWinCoupon, setQuizWinCoupon] = useState('');
  const [quizWinDesc, setQuizWinDesc] = useState('Feast trivia answered with gourmet mastery!');

  // QR Modal State
  const [qrModalGame, setQrModalGame] = useState<GameConfig | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrSvgString, setQrSvgString] = useState<string>('');
  const [generatingQr, setGeneratingQr] = useState(false);

  // 🎮 DEMO SANDBOX SIMULATOR STATE
  const [demoModalGame, setDemoModalGame] = useState<GameConfig | null>(null);
  const [demoOutcome, setDemoOutcome] = useState<GameOutcome | null>(null);
  const [demoReplayKey, setDemoReplayKey] = useState<number>(1);

  // Firestore Rules Helper
  const [copiedRules, setCopiedRules] = useState(false);

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
  const handleOpenCreate = (preselectedType?: GameType) => {
    const typeToUse = preselectedType || 'coin_flip';
    const typeInfo = GAME_TYPES.find(g => g.type === typeToUse);
    setEditingGame(null);
    setFormType(typeToUse);
    setFormTitle(`Bhatti Feast ${typeInfo?.label || 'Game'}`);
    setFormSubtitle('Scan at table to play and unlock secret dining discounts');
    setFormGameId(generateRandom6DigitCode());
    setFormIsActive(true);
    setFormMaxTurns(1);

    // Reset default specialized states
    const defaultCoupon = availableCoupons[0]?.code || '';
    setFormOutcomes([
      { id: '1', label: '50% OFF Handi Biryani', probabilityWeight: 20, isWin: true, couponCode: defaultCoupon, rewardDescription: 'Half price feast!' },
      { id: '2', label: 'Free Insulated Delivery', probabilityWeight: 30, isWin: true, couponCode: defaultCoupon, rewardDescription: 'Zero delivery fee' },
      { id: '3', label: 'Better Luck Next Time', probabilityWeight: 50, isWin: false, rewardDescription: 'Try again tomorrow' },
    ]);

    setCoinWinLabel('30% OFF Royal Handi Feast');
    setCoinWinCoupon(defaultCoupon);
    setCoinWinDesc('You called the coin toss correctly!');
    setCoinLossLabel('Better Luck Next Time');
    setCoinLossDesc('The coin landed on the opposite side. Try again next visit!');

    setScratchFoilTheme('gold');
    setMysteryBoxCount(3);
    setMemoryPairsCount(3);
    setMemoryMaxTurns(8);
    setMemoryWinLabel('Culinary Memory Champion • 25% OFF');
    setMemoryWinCoupon(defaultCoupon);
    setMemoryWinDesc('All chef secret ingredient cards matched!');

    setQuizPassingScore(2);
    setQuizQuestions(DEFAULT_QUIZ_QUESTIONS);
    setQuizWinLabel('Royal Foodie Trivia Scholar • 20% OFF');
    setQuizWinCoupon(defaultCoupon);
    setQuizWinDesc('Feast trivia answered with gourmet mastery!');

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

    // Restore specialized fields
    if (game.coinWinReward) {
      setCoinWinLabel(game.coinWinReward.label);
      setCoinWinCoupon(game.coinWinReward.couponCode || '');
      setCoinWinDesc(game.coinWinReward.rewardDescription || '');
    }
    if (game.coinLossOutcome) {
      setCoinLossLabel(game.coinLossOutcome.label);
      setCoinLossDesc(game.coinLossOutcome.rewardDescription || '');
    }

    setScratchFoilTheme(game.scratchFoilTheme || 'gold');
    setMysteryBoxCount(game.mysteryBoxCount || 3);
    setMemoryPairsCount(game.memoryPairsCount || 3);
    setMemoryMaxTurns(game.memoryMaxTurns || 8);
    const winOutcome = game.outcomes.find(o => o.isWin);
    if (winOutcome) {
      setMemoryWinLabel(winOutcome.label);
      setMemoryWinCoupon(winOutcome.couponCode || '');
      setMemoryWinDesc(winOutcome.rewardDescription || '');

      setQuizWinLabel(winOutcome.label);
      setQuizWinCoupon(winOutcome.couponCode || '');
      setQuizWinDesc(winOutcome.rewardDescription || '');
    }

    setQuizPassingScore(game.quizPassingScore || 2);
    setQuizQuestions(game.quizQuestions && game.quizQuestions.length >= 3 ? game.quizQuestions : DEFAULT_QUIZ_QUESTIONS);

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

  // Open Sandbox Demo Simulator
  const handleOpenDemo = (game: GameConfig) => {
    setDemoModalGame(game);
    setDemoOutcome(null);
    setDemoReplayKey(Date.now());
  };

  const handleResetDemo = () => {
    setDemoOutcome(null);
    setDemoReplayKey(Date.now());
  };

  // Copy Security Rules Helper
  const handleCopyRules = () => {
    const rules = `// Paste into Firebase Console > Firestore Database > Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;
    navigator.clipboard.writeText(rules);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 3000);
  };

  // Save Game Submit
  const handleSaveGameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formGameId.trim()) return;

    setIsSaving(true);

    // Build synthesized specialized outcomes
    let finalizedOutcomes: GameOutcome[] = [];
    let specializedCoinWin: GameOutcome | undefined;
    let specializedCoinLoss: GameOutcome | undefined;

    if (formType === 'coin_flip') {
      specializedCoinWin = {
        id: 'coin_win',
        label: coinWinLabel.trim() || '30% OFF Royal Handi Feast',
        probabilityWeight: 50,
        isWin: true,
        couponCode: coinWinCoupon.trim(),
        rewardDescription: coinWinDesc.trim() || 'You called the toss correctly!',
      };
      specializedCoinLoss = {
        id: 'coin_loss',
        label: coinLossLabel.trim() || 'Better Luck Next Time',
        probabilityWeight: 50,
        isWin: false,
        rewardDescription: coinLossDesc.trim() || 'Coin landed on the other side.',
      };
      finalizedOutcomes = [specializedCoinWin, specializedCoinLoss];
    } else if (formType === 'memory_match') {
      finalizedOutcomes = [
        {
          id: 'mem_win',
          label: memoryWinLabel.trim() || 'Memory Match Champion',
          probabilityWeight: 100,
          isWin: true,
          couponCode: memoryWinCoupon.trim(),
          rewardDescription: memoryWinDesc.trim() || 'Culinary cards matched!',
        },
        {
          id: 'mem_loss',
          label: 'Out of turns! Better luck next time.',
          probabilityWeight: 0,
          isWin: false,
          rewardDescription: 'Try again tomorrow.',
        }
      ];
    } else if (formType === 'quick_quiz') {
      finalizedOutcomes = [
        {
          id: 'quiz_win',
          label: quizWinLabel.trim() || 'Foodie Quiz Scholar',
          probabilityWeight: 100,
          isWin: true,
          couponCode: quizWinCoupon.trim(),
          rewardDescription: quizWinDesc.trim() || 'Passed the culinary quiz!',
        },
        {
          id: 'quiz_loss',
          label: 'Quiz Not Passed! Better Luck Next Time',
          probabilityWeight: 0,
          isWin: false,
          rewardDescription: 'Try again tomorrow.',
        }
      ];
    } else {
      // roulette, scratch_card, mystery_box use formOutcomes
      finalizedOutcomes = formOutcomes.map((o, idx) => ({
        ...o,
        id: o.id || `out_${idx + 1}`,
        label: o.label.trim(),
        probabilityWeight: Math.max(1, Number(o.probabilityWeight) || 1),
        couponCode: o.couponCode ? o.couponCode.trim() : '',
      }));
    }

    const payload: GameConfig = {
      id: editingGame ? editingGame.id : `game_${formGameId}`,
      gameId: formGameId.trim().toUpperCase(),
      title: formTitle.trim(),
      subtitle: formSubtitle.trim(),
      gameType: formType,
      isActive: formIsActive,
      maxTurnsPerSession: Number(formMaxTurns) || 1,
      dailyLimitPerDevice: 1,
      outcomes: finalizedOutcomes,
      totalPlays: editingGame ? editingGame.totalPlays : 0,
      totalWins: editingGame ? editingGame.totalWins : 0,
      createdAt: editingGame ? editingGame.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // Specialized fields
      coinWinReward: specializedCoinWin,
      coinLossOutcome: specializedCoinLoss,
      scratchFoilTheme: formType === 'scratch_card' ? scratchFoilTheme : undefined,
      mysteryBoxCount: formType === 'mystery_box' ? mysteryBoxCount : undefined,
      memoryPairsCount: formType === 'memory_match' ? memoryPairsCount : undefined,
      memoryMaxTurns: formType === 'memory_match' ? memoryMaxTurns : undefined,
      quizPassingScore: formType === 'quick_quiz' ? quizPassingScore : undefined,
      quizQuestions: formType === 'quick_quiz' ? quizQuestions : undefined,
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
    if (confirm(`Are you sure you want to delete "${game.title}" (ID #${game.gameId})? This will permanently retire this table QR code.`)) {
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

  // Outcome helpers for multi-slice engines
  const handleAddOutcome = () => {
    setFormOutcomes((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        label: 'Special Feast Perk',
        probabilityWeight: 20,
        isWin: true,
        couponCode: availableCoupons[0]?.code || '',
        rewardDescription: 'Exclusive dining perk',
      },
    ]);
  };

  const handleRemoveOutcome = (index: number) => {
    if (formOutcomes.length <= 2) {
      alert('Games require at least 2 outcomes for probability calculations.');
      return;
    }
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
                PATRON DINING ENGAGEMENT & REWARDS
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
            Create permanent, specialized arcade experiences with authentic mechanics (50/50 Coin Toss, Multi-Slice Roulette, Metallic Scratch Cards, Mystery Clay Handis, Memory Match, and Foodie Quizzes) with reusable coupons, instant standee vector QRs, and sandbox test-drive simulator.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleCopyRules}
            className="px-3.5 py-2.5 rounded-2xl bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Copy Cloud Firestore security rules for Firebase console"
          >
            {copiedRules ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <ShieldCheck className="w-4 h-4 text-amber-400" />}
            <span>{copiedRules ? 'Rules Copied!' : 'Firestore Rules'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenCreate()}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer hover:scale-102 active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Game ➜</span>
          </button>
        </div>
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
            onClick={() => handleOpenCreate()}
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
                      🎯 {g.gameType === 'coin_flip' ? 'Authentic 50/50 Toss' : `${g.outcomes?.length || 0} Outcomes`}
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

                {/* Actions Grid */}
                <div className="space-y-2 pt-2 border-t border-brand-green/5">
                  {/* Primary Test-Drive Demo & Standee QR */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDemo(g)}
                      className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="Test-drive this game in zero-data sandbox simulator"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Play Demo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenQr(g)}
                      className="py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 border border-amber-400/40 text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-amber-700" />
                      <span>Standee QR</span>
                    </button>
                  </div>

                  {/* Secondary Edit, Live Link, Delete */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(g)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-brand-cream/50 hover:bg-brand-cream text-brand-charcoal border border-brand-green/10 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Edit Game"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <a
                      href={`/?gameon=${g.gameId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-brand-cream/50 hover:bg-brand-cream text-brand-green border border-brand-green/10 transition-colors cursor-pointer"
                      title="Live Customer Link (New Tab)"
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
              </div>
            );
          })}
        </div>
      )}

      {/* 🛠️ SPECIALIZED CREATOR & EDITOR MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-brand-green/15 shadow-2xl overflow-hidden relative my-6">
            {/* Modal Header */}
            <div className="px-6 pt-5 pb-3 border-b border-brand-green/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-brand-charcoal tracking-tight">
                    {editingGame ? 'Edit Game Experience' : 'Create Specialized Game Experience'}
                  </h3>
                  <p className="text-[11px] text-brand-charcoal/60">
                    Engine-tailored rules, un-rigged mechanics, and reusable coupon attachments
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
                      onClick={() => {
                        setFormType(t.type);
                        if (!editingGame) {
                          setFormTitle(`Bhatti Feast ${t.label}`);
                        }
                      }}
                      className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        formType === t.type
                          ? 'border-brand-green bg-brand-green/5 shadow-xs'
                          : 'border-brand-green/10 hover:border-brand-green/30 bg-white'
                      }`}
                    >
                      <div className="text-2xl">{t.icon}</div>
                      <div className="text-xs font-black text-brand-charcoal mt-1">{t.label}</div>
                      <div className="text-[9px] text-brand-green font-bold uppercase">{t.category}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & 6-Digit ID with Reroll */}
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
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-brand-charcoal/50">
                      6-Digit Game ID
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormGameId(generateRandom6DigitCode())}
                      className="text-[10px] font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                      title="Generate new 6-digit code"
                    >
                      <Shuffle className="w-3 h-3" />
                      <span>Reroll</span>
                    </button>
                  </div>
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

              {/* ============================================================ */}
              {/* SPECIALIZED BUILDER SECTION PER GAME ENGINE                 */}
              {/* ============================================================ */}

              {/* 1. COIN TOSS (AUTHENTIC 50/50 PHYSICAL COIN MECHANICS) */}
              {formType === 'coin_flip' && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-600" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                        Authentic 50/50 Coin Toss Engine
                      </h4>
                      <p className="text-[11px] text-amber-800/80">
                        Patrons choose either <strong>Royal Crest</strong> or <strong>Bhatti Flame</strong>. The toss outcome is a fair physical 50/50 probability. No artificial probability manipulation.
                      </p>
                    </div>
                  </div>

                  {/* Winning Outcome Settings */}
                  <div className="p-3 bg-white rounded-xl border border-amber-500/20 space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-wider text-brand-green flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      <span>Winner Reward (If patron calls correctly)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold uppercase text-stone-500 block">
                          Reward Title
                        </label>
                        <input
                          type="text"
                          required
                          value={coinWinLabel}
                          onChange={(e) => setCoinWinLabel(e.target.value)}
                          placeholder="e.g. 30% OFF Handi Feast"
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold uppercase text-brand-green block">
                          Attach Store Coupon (Multiple outcomes allowed)
                        </label>
                        <select
                          value={coinWinCoupon}
                          onChange={(e) => setCoinWinCoupon(e.target.value)}
                          className="w-full bg-stone-50 border border-brand-green/30 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-stone-800 focus:outline-none"
                        >
                          <option value="">-- No Auto Coupon / Text Reward Only --</option>
                          {availableCoupons.map((c) => (
                            <option key={c.id} value={c.code}>
                              {c.code} ({c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold uppercase text-stone-500 block">
                        Win Banner Subtitle
                      </label>
                      <input
                        type="text"
                        value={coinWinDesc}
                        onChange={(e) => setCoinWinDesc(e.target.value)}
                        placeholder="e.g. You called the toss correctly! Enjoy your feast discount."
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Consolation Outcome Settings */}
                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                      Consolation Message (If patron calls incorrectly)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={coinLossLabel}
                        onChange={(e) => setCoinLossLabel(e.target.value)}
                        placeholder="Better Luck Next Time"
                        className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                      />
                      <input
                        type="text"
                        value={coinLossDesc}
                        onChange={(e) => setCoinLossDesc(e.target.value)}
                        placeholder="Coin landed on the opposite side. Try again next visit!"
                        className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. SCRATCH CARD SPECIALIZED SETTINGS */}
              {formType === 'scratch_card' && (
                <div className="p-3.5 bg-brand-cream/30 border border-brand-green/10 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
                        Scratch Card Foil Theme
                      </h4>
                      <p className="text-[10px] text-brand-charcoal/60">
                        Choose the metallic scratch coating rendered on the diner's screen
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(['gold', 'charcoal', 'ember'] as const).map((theme) => (
                        <button
                          key={theme}
                          type="button"
                          onClick={() => setScratchFoilTheme(theme)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                            scratchFoilTheme === theme
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-white text-stone-600 border border-stone-200'
                          }`}
                        >
                          {theme === 'gold' ? '✨ 24K Gold' : theme === 'charcoal' ? '🌑 Charcoal' : '🔥 Ember Copper'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. MYSTERY CLAY HANDIS SETTINGS */}
              {formType === 'mystery_box' && (
                <div className="p-3.5 bg-brand-cream/30 border border-brand-green/10 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
                        Number of Sealed Handis
                      </h4>
                      <p className="text-[10px] text-brand-charcoal/60">
                        Choose how many clay pots are displayed for the diner to unseal
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {[3, 4].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setMysteryBoxCount(count)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            mysteryBoxCount === count
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-white text-stone-600 border border-stone-200'
                          }`}
                        >
                          🏺 {count} Handis
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. MEMORY MATCH SPECIALIZED SETTINGS */}
              {formType === 'memory_match' && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-purple-900">
                        Memory Match Card Engine
                      </h4>
                      <p className="text-[11px] text-purple-800/80">
                        Patrons flip gourmet cards to find matching pairs within the allowed turns limit.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-purple-900 block">
                        Grid Size (Number of Pairs)
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        {[3, 4].map((pairs) => (
                          <button
                            key={pairs}
                            type="button"
                            onClick={() => setMemoryPairsCount(pairs)}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                              memoryPairsCount === pairs
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-white text-purple-900 border border-purple-200'
                            }`}
                          >
                            {pairs} Pairs ({pairs * 2} Cards)
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-purple-900 block">
                        Maximum Turns Allowed Before Game Over
                      </label>
                      <input
                        type="number"
                        min={4}
                        max={16}
                        value={memoryMaxTurns}
                        onChange={(e) => setMemoryMaxTurns(parseInt(e.target.value, 10) || 8)}
                        className="w-full mt-1 bg-white border border-purple-200 rounded-xl px-3 py-1.5 text-xs font-bold text-purple-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Victory Reward */}
                  <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-purple-900">
                      🏆 Victory Reward (On matching all cards)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={memoryWinLabel}
                        onChange={(e) => setMemoryWinLabel(e.target.value)}
                        placeholder="e.g. Memory Champion • 25% OFF"
                        className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                      />
                      <select
                        value={memoryWinCoupon}
                        onChange={(e) => setMemoryWinCoupon(e.target.value)}
                        className="bg-stone-50 border border-purple-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-stone-800 focus:outline-none"
                      >
                        <option value="">-- No Auto Coupon / Custom Code --</option>
                        {availableCoupons.map((c) => (
                          <option key={c.id} value={c.code}>
                            {c.code} ({c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. QUICK QUIZ SPECIALIZED SETTINGS */}
              {formType === 'quick_quiz' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900">
                          Royal Bhatti Foodie Quiz Engine
                        </h4>
                        <p className="text-[11px] text-emerald-800/80">
                          3 fast-paced trivia questions against a 12-second timer per question
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-900 uppercase">Passing Score:</span>
                      {[2, 3].map((threshold) => (
                        <button
                          key={threshold}
                          type="button"
                          onClick={() => setQuizPassingScore(threshold)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                            quizPassingScore === threshold
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'bg-white text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          {threshold}/3 Correct
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Victory Reward */}
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-emerald-900">
                      🏆 Victory Reward (On achieving passing score)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={quizWinLabel}
                        onChange={(e) => setQuizWinLabel(e.target.value)}
                        placeholder="e.g. Royal Foodie Scholar • 20% OFF"
                        className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                      />
                      <select
                        value={quizWinCoupon}
                        onChange={(e) => setQuizWinCoupon(e.target.value)}
                        className="bg-stone-50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-stone-800 focus:outline-none"
                      >
                        <option value="">-- No Auto Coupon / Custom Code --</option>
                        {availableCoupons.map((c) => (
                          <option key={c.id} value={c.code}>
                            {c.code} ({c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 3 Questions Builder */}
                  <div className="space-y-3 pt-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block">
                      3 Trivia Questions & Correct Answers
                    </span>
                    {quizQuestions.map((q, qIdx) => (
                      <div key={q.id || qIdx} className="p-3 bg-white rounded-xl border border-emerald-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-emerald-800">
                            Question #{qIdx + 1}
                          </span>
                          <span className="text-[9px] text-emerald-700 font-bold">
                            Select correct radio answer
                          </span>
                        </div>
                        <input
                          type="text"
                          required
                          value={q.question}
                          onChange={(e) => {
                            const copy = [...quizQuestions];
                            copy[qIdx] = { ...copy[qIdx], question: e.target.value };
                            setQuizQuestions(copy);
                          }}
                          placeholder="Question prompt..."
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-1.5">
                              <input
                                type="radio"
                                name={`correct_${qIdx}`}
                                checked={q.correctIndex === optIdx}
                                onChange={() => {
                                  const copy = [...quizQuestions];
                                  copy[qIdx] = { ...copy[qIdx], correctIndex: optIdx };
                                  setQuizQuestions(copy);
                                }}
                                className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <input
                                type="text"
                                required
                                value={opt}
                                onChange={(e) => {
                                  const copy = [...quizQuestions];
                                  const opts = [...copy[qIdx].options];
                                  opts[optIdx] = e.target.value;
                                  copy[qIdx] = { ...copy[qIdx], options: opts };
                                  setQuizQuestions(copy);
                                }}
                                className={`w-full text-[11px] px-2 py-1 rounded-md border ${
                                  q.correctIndex === optIdx 
                                    ? 'border-emerald-500 bg-emerald-50/50 font-bold text-emerald-950' 
                                    : 'border-stone-200 bg-stone-50 text-stone-700'
                                }`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. MULTI-OUTCOME PROBABILITY MATRIX (FOR ROULETTE, SCRATCH, MYSTERY) */}
              {formType !== 'coin_flip' && formType !== 'memory_match' && formType !== 'quick_quiz' && (
                <div className="space-y-3 pt-2 border-t border-brand-green/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
                        Outcomes & Probability Matrix
                      </h4>
                      <p className="text-[10px] text-brand-charcoal/60">
                        Configure slices/prizes and attach store coupon codes (same coupon can be reused freely)
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
                              Outcome Label
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

                        {/* Bottom Row: Coupon Picker & Working Delete Button for ALL Outcomes */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-brand-green/5">
                          <div className="flex-1">
                            <label className="text-[9px] font-bold uppercase text-brand-green block">
                              Attached Store Coupon (Reusable across outcomes)
                            </label>
                            <select
                              value={outcome.couponCode || ''}
                              onChange={(e) => handleUpdateOutcome(idx, { couponCode: e.target.value })}
                              className="w-full bg-white border border-brand-green/20 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-brand-charcoal focus:outline-none"
                            >
                              <option value="">-- No Auto Coupon / Custom Code --</option>
                              {availableCoupons.map((c) => (
                                <option key={c.id} value={c.code}>
                                  {c.code} ({c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Working Delete Button for Win or Loss outcomes */}
                          {formOutcomes.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOutcome(idx)}
                              className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 cursor-pointer shrink-0 mt-3 transition-colors"
                              title="Delete Outcome"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

      {/* 🎮 PLAY DEMO TEST-DRIVE SIMULATOR (ZERO DATA RECORDED) */}
      {demoModalGame && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in font-sans overflow-y-auto">
          <div className="w-full max-w-xl bg-stone-950 border-2 border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden relative my-auto text-white">
            {/* Simulation Header Banner */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border-b border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Play className="w-4 h-4 fill-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      🧪 ADMIN PLAY DEMO SIMULATOR
                    </span>
                  </div>
                  <h3 className="text-xs font-extrabold text-white mt-0.5">
                    {demoModalGame.title} (ID #{demoModalGame.gameId})
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 border border-stone-700 transition-colors cursor-pointer"
                  title="Reset and play demo again"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restart</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDemoModalGame(null)}
                  className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Close Demo Simulator"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sandbox Notice Banner */}
            <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-300 flex items-center justify-between">
              <span>🛡️ Sandbox Mode: Zero plays recorded • No turns deducted • No real coupons issued</span>
              <span className="font-mono text-[10px] text-amber-400/70">Engine: {demoModalGame.gameType}</span>
            </div>

            {/* Live Interactive Game Component */}
            <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[380px]">
              <div key={demoReplayKey} className="w-full flex flex-col items-center">
                {demoModalGame.gameType === 'coin_flip' && (
                  <CoinFlipGame
                    game={demoModalGame}
                    onFinishTurn={(outcome) => setDemoOutcome(outcome)}
                    disabled={demoOutcome !== null}
                  />
                )}
                {demoModalGame.gameType === 'roulette' && (
                  <RouletteGame
                    game={demoModalGame}
                    onFinishTurn={(outcome) => setDemoOutcome(outcome)}
                    disabled={demoOutcome !== null}
                  />
                )}
                {demoModalGame.gameType === 'scratch_card' && (
                  <ScratchCardGame
                    game={demoModalGame}
                    onFinishTurn={(outcome) => setDemoOutcome(outcome)}
                    disabled={demoOutcome !== null}
                  />
                )}
                {demoModalGame.gameType === 'mystery_box' && (
                  <MysteryBoxGame
                    game={demoModalGame}
                    onFinishTurn={(outcome) => setDemoOutcome(outcome)}
                    disabled={demoOutcome !== null}
                  />
                )}
                {demoModalGame.gameType === 'memory_match' && (
                  <MemoryMatchGame
                    game={demoModalGame}
                    onFinishTurn={(outcome) => setDemoOutcome(outcome)}
                    disabled={demoOutcome !== null}
                  />
                )}
                {demoModalGame.gameType === 'quick_quiz' && (
                  <QuickQuizGame
                    game={demoModalGame}
                    onFinishTurn={(outcome) => setDemoOutcome(outcome)}
                    disabled={demoOutcome !== null}
                  />
                )}
              </div>

              {/* DEMO RESULT OVERLAY */}
              {demoOutcome && (
                <div className="mt-6 w-full p-4 rounded-2xl bg-stone-900 border-2 border-amber-500/40 text-center space-y-3 animate-fade-in shadow-xl">
                  <div className="flex items-center justify-center gap-1.5">
                    {demoOutcome.isWin ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black text-xs uppercase flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>Simulated Winner Outcome</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-stone-700/50 text-stone-300 border border-stone-600 font-bold text-xs uppercase">
                        Simulated Consolation Outcome
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-extrabold text-white">
                    {demoOutcome.label}
                  </h4>
                  {demoOutcome.rewardDescription && (
                    <p className="text-xs text-stone-400">
                      {demoOutcome.rewardDescription}
                    </p>
                  )}

                  {demoOutcome.couponCode && (
                    <div className="p-2.5 rounded-xl bg-stone-950 border border-amber-500/30 font-mono text-amber-400 text-xs font-black inline-block px-4">
                      Attached Coupon: {demoOutcome.couponCode}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetDemo}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Play Again</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoModalGame(null)}
                      className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold cursor-pointer"
                    >
                      Close Simulator
                    </button>
                  </div>
                </div>
              )}
            </div>
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
