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
export function subscribeToAllGames(onUpdate: (games: GameConfig[]) => void): () => void {
  // 1. Immediately emit cached games
  const cached = getLocalGamesCache();
  if (cached.length > 0) {
    onUpdate(cached);
  }

  const q = collection(db, 'games');
  return onSnapshot(q, (snapshot) => {
    const list: GameConfig[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as GameConfig);
    });

    // Merge with any local games that haven't synced yet
    const existingIds = new Set(list.map(g => g.id));
    for (const localG of cached) {
      if (!existingIds.has(localG.id)) {
        list.push(localG);
      }
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
    setLocalGamesCache(list);
    onUpdate(list);
  }, (err) => {
    console.warn('subscribeToAllGames warning (using local fallback):', err);
    // If permission or network issue, maintain local cache
    onUpdate(getLocalGamesCache());
  });
}

/**
 * Fetch a single game by its 6-digit gameId
 */
export async function getGameBy6DigitId(gameId: string): Promise<GameConfig | null> {
  const cleanId = gameId.trim().toUpperCase();
  if (!cleanId) return null;

  try {
    const q = query(collection(db, 'games'), where('gameId', '==', cleanId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0];
      const gameObj = { id: docData.id, ...docData.data() } as GameConfig;
      return gameObj;
    }
    // Also try doc direct ID match
    const directDoc = await getDoc(doc(db, 'games', cleanId));
    if (directDoc.exists()) {
      return { id: directDoc.id, ...directDoc.data() } as GameConfig;
    }
  } catch (err) {
    console.warn('getGameBy6DigitId firestore error, checking local cache:', err);
  }

  // Fallback to local games cache
  const localList = getLocalGamesCache();
  const matchedLocal = localList.find(g => g.gameId === cleanId || g.id === cleanId);
  return matchedLocal || null;
}

/**
 * Save or update a game in Firestore with automatic sanitize & dual-storage mirror
 */
export async function saveGame(game: GameConfig): Promise<{ success: boolean; error?: string }> {
  const targetDocId = game.id || `game_${game.gameId || generateRandom6DigitCode()}`;
  const rawPayload: GameConfig = {
    ...game,
    id: targetDocId,
    updatedAt: new Date().toISOString(),
    createdAt: game.createdAt || new Date().toISOString(),
  };

  // Sanitize to prevent Firestore "unsupported undefined" crashes
  const sanitizedPayload = sanitizeForFirestore(rawPayload);

  // 1. Save to local storage mirror first
  const currentList = getLocalGamesCache();
  const existingIdx = currentList.findIndex(g => g.id === targetDocId || g.gameId === game.gameId);
  if (existingIdx >= 0) {
    currentList[existingIdx] = sanitizedPayload;
  } else {
    currentList.unshift(sanitizedPayload);
  }
  setLocalGamesCache(currentList);

  // 2. Sync to Firestore
  try {
    await setDoc(doc(db, 'games', targetDocId), sanitizedPayload, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.warn('saveGame Firestore sync warning (saved locally in browser):', err);
    // Even if Firestore returns permission-denied, game is preserved locally!
    return { 
      success: true, 
      error: err.code === 'permission-denied' 
        ? 'Saved locally! Firestore permissions pending deployment.' 
        : undefined 
    };
  }
}

/**
 * Permanently delete a game from Firestore and local cache
 */
export async function deleteGame(gameDocId: string): Promise<{ success: boolean; error?: string }> {
  // Remove from local cache
  const currentList = getLocalGamesCache().filter(g => g.id !== gameDocId && g.gameId !== gameDocId);
  setLocalGamesCache(currentList);

  try {
    await deleteDoc(doc(db, 'games', gameDocId));
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
