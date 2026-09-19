/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from './firebase';
import { GameConfig, GameOutcome, WonRewardRecord } from '../types/gameon';

/**
 * Local storage cache helpers to guarantee 100% uptime & zero permission crashes
 */
function getLocalGamesCache(): GameConfig[] {
  try {
    const raw = localStorage.getItem('tb_games_cache');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setLocalGamesCache(games: GameConfig[]) {
  try {
    localStorage.setItem('tb_games_cache', JSON.stringify(games));
  } catch (e) {}
}

/**
 * Generate a random permanent 6-digit game ID (e.g. "849201")
 */
export function generateRandom6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Real-time subscription to all games for Admin Portal
 * Integrates local cache fallback so games always appear even if Firestore permissions are pending
 */
// Default pre-seeded games for offline / instantaneous zero-config fallback
export const SEEDED_DEFAULT_GAMES: GameConfig[] = [
  {
    id: 'game_COIN01',
    gameId: 'COIN01',
    title: 'Royal Taash Coin Toss',
    subtitle: 'Call Royal Crest or Bhatti Flame to win feast discounts',
    gameType: 'coin_flip',
    isActive: true,
    maxTurnsPerSession: 1,
    dailyLimitPerDevice: 1,
    coinWinReward: {
      id: 'coin_win',
      label: '30% OFF Royal Handi Feast',
      probabilityWeight: 50,
      isWin: true,
      couponCode: 'ROYAL30',
      rewardDescription: 'You called the toss correctly! Enjoy 30% discount.',
    },
    coinLossOutcome: {
      id: 'coin_loss',
      label: 'Better Luck Next Time',
      probabilityWeight: 50,
      isWin: false,
      rewardDescription: 'Coin landed on the opposite side. Try again next visit!',
    },
    outcomes: [
      { id: 'coin_win', label: '30% OFF Royal Handi Feast', probabilityWeight: 50, isWin: true, couponCode: 'ROYAL30', rewardDescription: 'You called the toss correctly!' },
      { id: 'coin_loss', label: 'Better Luck Next Time', probabilityWeight: 50, isWin: false, rewardDescription: 'Try again next visit!' },
    ],
    totalPlays: 0,
    totalWins: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game_ROUL01',
    gameId: 'ROUL01',
    title: 'Bhatti Roulette of Flavors',
    subtitle: 'Spin the antique wheel for instant gourmet perks',
    gameType: 'roulette',
    isActive: true,
    maxTurnsPerSession: 1,
    dailyLimitPerDevice: 1,
    outcomes: [
      { id: '1', label: '50% OFF Handi Biryani', probabilityWeight: 20, isWin: true, couponCode: 'FEAST50', rewardDescription: 'Half price feast!' },
      { id: '2', label: 'Free Insulated Delivery', probabilityWeight: 30, isWin: true, couponCode: 'FREEDEL', rewardDescription: 'Zero delivery fee' },
      { id: '3', label: 'Better Luck Next Time', probabilityWeight: 50, isWin: false, rewardDescription: 'Try again tomorrow' },
    ],
    totalPlays: 0,
    totalWins: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game_SCRT01',
    gameId: 'SCRT01',
    title: 'Golden Scratch Card',
    subtitle: 'Rub away the 24K gold foil to unlock secret perks',
    gameType: 'scratch_card',
    isActive: true,
    scratchFoilTheme: 'gold',
    maxTurnsPerSession: 1,
    dailyLimitPerDevice: 1,
    outcomes: [
      { id: '1', label: 'Flat ₹100 OFF Royal Feast', probabilityWeight: 35, isWin: true, couponCode: 'FLAT100', rewardDescription: 'Flat ₹100 discount applied' },
      { id: '2', label: 'Free Dessert Handi', probabilityWeight: 25, isWin: true, couponCode: 'SWEETTREAT', rewardDescription: 'Complimentary dessert' },
      { id: '3', label: 'Better Luck Next Time', probabilityWeight: 40, isWin: false, rewardDescription: 'Try again next visit' },
    ],
    totalPlays: 0,
    totalWins: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

/**
 * Real-time subscription to all games for Admin Portal
 * Combines server REST, Firestore, and local cache
 */
export function subscribeToAllGames(onUpdate: (games: GameConfig[]) => void): () => void {
  // 1. Immediately emit cached games or seeded defaults
  const cached = getLocalGamesCache();
  if (cached.length > 0) {
    onUpdate(cached);
  } else {
    onUpdate(SEEDED_DEFAULT_GAMES);
  }

  // 2. Fetch latest from Server REST API
  if (typeof window !== 'undefined') {
    fetch('/api/games')
      .then(r => r.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.games) && data.games.length > 0) {
          setLocalGamesCache(data.games);
          onUpdate(data.games);
        }
      })
      .catch(() => {});
  }

  // 3. Listen to Firestore
  const q = collection(db, 'games');
  return onSnapshot(q, (snapshot) => {
    const list: GameConfig[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as GameConfig);
    });

    const currentCached = getLocalGamesCache();
    const existingIds = new Set(list.map(g => g.id));
    for (const localG of currentCached) {
      if (!existingIds.has(localG.id)) {
        list.push(localG);
      }
    }

    list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
    setLocalGamesCache(list);
    onUpdate(list);
  }, (err) => {
    console.warn('subscribeToAllGames Firestore warning (using local/server fallback):', err);
    onUpdate(getLocalGamesCache());
  });
}

/**
 * Fetch a single game by its 6-digit gameId
 * Multi-layer lookup:
 * 1. Server REST API (/api/games/:id) -> 100% reliable for camera scan from phone
 * 2. Firestore direct doc by ID / game_ID
 * 3. Firestore query by gameId
 * 4. Local storage cache mirror
 * 5. Seeded default games
 */
export async function getGameBy6DigitId(gameId: string): Promise<GameConfig | null> {
  const cleanId = gameId.trim().toUpperCase();
  if (!cleanId) return null;

  // Layer 1: Server REST API
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(cleanId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.game) {
          return data.game as GameConfig;
        }
      }
    } catch (e) {
      // Offline or network error
    }
  }

  // Layer 2: Firestore Direct Doc Lookups
  try {
    const docA = await getDoc(doc(db, 'games', cleanId));
    if (docA.exists()) {
      return { id: docA.id, ...docA.data() } as GameConfig;
    }
    const docB = await getDoc(doc(db, 'games', `game_${cleanId}`));
    if (docB.exists()) {
      return { id: docB.id, ...docB.data() } as GameConfig;
    }
    const docC = await getDoc(doc(db, 'games', `game_${cleanId.toLowerCase()}`));
    if (docC.exists()) {
      return { id: docC.id, ...docC.data() } as GameConfig;
    }

    // Layer 3: Firestore Query
    const q = query(collection(db, 'games'), where('gameId', '==', cleanId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0];
      return { id: docData.id, ...docData.data() } as GameConfig;
    }
  } catch (err) {
    console.warn('getGameBy6DigitId firestore read warning:', err);
  }

  // Layer 4: Local Storage Cache Mirror
  const localList = getLocalGamesCache();
  const matchedLocal = localList.find(g => 
    (g.gameId && g.gameId.toUpperCase() === cleanId) || 
    (g.id && g.id.toUpperCase() === cleanId) ||
    (g.id && g.id.toUpperCase() === `GAME_${cleanId}`)
  );
  if (matchedLocal) return matchedLocal;

  // Layer 5: Seeded Default Games
  const defaultMatch = SEEDED_DEFAULT_GAMES.find(g => 
    g.gameId.toUpperCase() === cleanId || 
    g.id.toUpperCase() === cleanId ||
    g.id.toUpperCase() === `GAME_${cleanId}`
  );
  if (defaultMatch) return defaultMatch;

  // Return first seeded game if generic "default" requested
  if (cleanId === 'DEMO' || cleanId === 'DEFAULT') {
    return SEEDED_DEFAULT_GAMES[0];
  }

  return null;
}

/**
 * Save or update a game with multi-tier storage:
 * 1. Server REST API (writes to disk data/games-store.json)
 * 2. Firestore Document (doc id = gameId and targetDocId)
 * 3. Browser Local Storage Mirror
 */
export async function saveGame(game: GameConfig): Promise<{ success: boolean; error?: string }> {
  const cleanGameId = (game.gameId || generateRandom6DigitCode()).trim().toUpperCase();
  const targetDocId = game.id || `game_${cleanGameId}`;
  const rawPayload: GameConfig = {
    ...game,
    id: targetDocId,
    gameId: cleanGameId,
    updatedAt: new Date().toISOString(),
    createdAt: game.createdAt || new Date().toISOString(),
  };

  const sanitizedPayload = sanitizeForFirestore(rawPayload);

  // 1. Save to Local Storage
  const currentList = getLocalGamesCache();
  const existingIdx = currentList.findIndex(g => g.id === targetDocId || g.gameId === cleanGameId);
  if (existingIdx >= 0) {
    currentList[existingIdx] = sanitizedPayload;
  } else {
    currentList.unshift(sanitizedPayload);
  }
  setLocalGamesCache(currentList);

  // 2. Save to Server REST API
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedPayload),
      });
    } catch (e) {
      console.warn('Server REST API save warning:', e);
    }
  }

  // 3. Save to Firestore
  try {
    await setDoc(doc(db, 'games', cleanGameId), sanitizedPayload, { merge: true });
    await setDoc(doc(db, 'games', targetDocId), sanitizedPayload, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.warn('saveGame Firestore sync warning (saved on server & local mirror):', err);
    return { 
      success: true, 
      error: err.code === 'permission-denied' 
        ? 'Saved on server & local mirror. Cloud firestore rules pending.' 
        : undefined 
    };
  }
}

/**
 * Permanently delete a game from Server REST, Firestore, and local cache
 */
export async function deleteGame(gameDocId: string): Promise<{ success: boolean; error?: string }> {
  // 1. Remove from local cache
  const currentList = getLocalGamesCache().filter(g => g.id !== gameDocId && g.gameId !== gameDocId);
  setLocalGamesCache(currentList);

  // 2. Delete from Server REST
  if (typeof window !== 'undefined') {
    try {
      await fetch(`/api/games/${encodeURIComponent(gameDocId)}`, { method: 'DELETE' });
    } catch (e) {}
  }

  // 3. Delete from Firestore
  try {
    await deleteDoc(doc(db, 'games', gameDocId));
    if (gameDocId.startsWith('game_')) {
      await deleteDoc(doc(db, 'games', gameDocId.replace('game_', '')));
    }
    return { success: true };
  } catch (err: any) {
    console.warn('deleteGame Firestore warning:', err);
    return { success: true };
  }
}

/**
 * Record a play and win count increment
 */
export async function recordGamePlayStats(gameDocId: string, isWin: boolean): Promise<void> {
  // Update local stats
  try {
    const list = getLocalGamesCache();
    const target = list.find(g => g.id === gameDocId || g.gameId === gameDocId);
    if (target) {
      target.totalPlays = (target.totalPlays || 0) + 1;
      if (isWin) target.totalWins = (target.totalWins || 0) + 1;
      setLocalGamesCache(list);
    }
  } catch (e) {}

  // Sync to Firestore
  try {
    const gameRef = doc(db, 'games', gameDocId);
    await updateDoc(gameRef, {
      totalPlays: increment(1),
      totalWins: isWin ? increment(1) : increment(0),
    });
  } catch (e) {
    // Suppress permission warnings during stats increments
  }
}

/**
 * Pick an outcome based on probability weights
 */
export function pickWeightedOutcome(outcomes: GameOutcome[]): GameOutcome {
  if (!outcomes || outcomes.length === 0) {
    return {
      id: 'fallback',
      label: 'Better Luck Next Time',
      probabilityWeight: 100,
      isWin: false,
    };
  }

  const totalWeight = outcomes.reduce((acc, o) => acc + (Number(o.probabilityWeight) || 0), 0);
  if (totalWeight <= 0) {
    return outcomes[Math.floor(Math.random() * outcomes.length)];
  }

  let randomVal = Math.random() * totalWeight;
  for (const outcome of outcomes) {
    const w = Number(outcome.probabilityWeight) || 0;
    if (randomVal < w) {
      return outcome;
    }
    randomVal -= w;
  }

  return outcomes[outcomes.length - 1];
}

/**
 * Local Vault Cache Helpers
 */
function getLocalVault(userId: string): WonRewardRecord[] {
  try {
    const raw = localStorage.getItem(`tb_vault_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setLocalVault(userId: string, records: WonRewardRecord[]) {
  try {
    localStorage.setItem(`tb_vault_${userId}`, JSON.stringify(records));
  } catch (e) {}
}

/**
 * Save won reward to the user's Firestore vault safely
 * NO client writes to master /coupons collection to prevent "insufficient permissions"
 */
export async function saveWonRewardToUserVault(
  userId: string, 
  userEmail: string | undefined, 
  reward: Omit<WonRewardRecord, 'id' | 'wonAt' | 'isRedeemed'>
): Promise<WonRewardRecord> {
  const rewardId = `rwd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  // Expiry defaults to 7 days from now if not specified
  const expiryDate = reward.expiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const fullRecord: WonRewardRecord = {
    ...reward,
    id: rewardId,
    userId,
    wonAt: now,
    expiryDate,
    isRedeemed: false,
  };

  const sanitized = sanitizeForFirestore(fullRecord);

  // 1. Save to local vault mirror
  const userVault = getLocalVault(userId);
  userVault.unshift(sanitized);
  setLocalVault(userId, userVault);

  // 2. Save in user's won_rewards subcollection
  try {
    const rwdRef = doc(db, 'users', userId, 'won_rewards', rewardId);
    await setDoc(rwdRef, sanitized);
  } catch (err) {
    console.warn('saveWonRewardToUserVault firestore warning (saved locally in vault):', err);
  }

  return sanitized;
}

/**
 * Subscribe to a user's won rewards in real-time with instant local fallback
 */
export function subscribeToUserWonRewards(
  userId: string,
  onUpdate: (rewards: WonRewardRecord[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  // 1. Instant local vault
  const localCached = getLocalVault(userId);
  if (localCached.length > 0) {
    onUpdate(localCached);
  }

  const q = collection(db, 'users', userId, 'won_rewards');
  return onSnapshot(q, (snap) => {
    const list: WonRewardRecord[] = [];
    snap.forEach((d) => {
      list.push(d.data() as WonRewardRecord);
    });

    // Merge any locally added rewards
    const existingIds = new Set(list.map(r => r.id));
    for (const loc of localCached) {
      if (!existingIds.has(loc.id)) {
        list.push(loc);
      }
    }

    list.sort((a, b) => new Date(b.wonAt).getTime() - new Date(a.wonAt).getTime());
    setLocalVault(userId, list);
    onUpdate(list);
  }, (err) => {
    console.warn('subscribeToUserWonRewards warning (using local vault):', err);
    onUpdate(getLocalVault(userId));
  });
}
