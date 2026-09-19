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
import { db } from './firebase';
import { GameConfig, GameOutcome, WonRewardRecord } from '../types/gameon';

/**
 * Generate a random permanent 6-digit game ID (e.g. "849201")
 */
export function generateRandom6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Real-time subscription to all games for Admin Portal
 */
export function subscribeToAllGames(onUpdate: (games: GameConfig[]) => void): () => void {
  const q = collection(db, 'games');
  return onSnapshot(q, (snapshot) => {
    const list: GameConfig[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as GameConfig);
    });
    // Sort newest first
    list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
    onUpdate(list);
  }, (err) => {
    console.warn('subscribeToAllGames error:', err);
    onUpdate([]);
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
      return { id: docData.id, ...docData.data() } as GameConfig;
    }
    // Also try doc direct ID match
    const directDoc = await getDoc(doc(db, 'games', cleanId));
    if (directDoc.exists()) {
      return { id: directDoc.id, ...directDoc.data() } as GameConfig;
    }
    return null;
  } catch (err) {
    console.warn('getGameBy6DigitId error:', err);
    return null;
  }
}

/**
 * Save or update a game in Firestore
 */
export async function saveGame(game: GameConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const targetDocId = game.id || `game_${game.gameId || generateRandom6DigitCode()}`;
    const payload: GameConfig = {
      ...game,
      id: targetDocId,
      updatedAt: new Date().toISOString(),
      createdAt: game.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'games', targetDocId), payload, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('saveGame error:', err);
    return { success: false, error: err.message || 'Failed to save game configuration.' };
  }
}

/**
 * Permanently delete a game from Firestore
 */
export async function deleteGame(gameDocId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'games', gameDocId));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete game.' };
  }
}

/**
 * Record a play and win count increment
 */
export async function recordGamePlayStats(gameDocId: string, isWin: boolean): Promise<void> {
  try {
    const gameRef = doc(db, 'games', gameDocId);
    await updateDoc(gameRef, {
      totalPlays: increment(1),
      totalWins: isWin ? increment(1) : increment(0),
    });
  } catch (e) {
    console.warn('recordGamePlayStats warning:', e);
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
 * Save won reward to the user's Firestore vault and lock coupon to their account
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

  try {
    // 1. Save in user's won_rewards subcollection
    const rwdRef = doc(db, 'users', userId, 'won_rewards', rewardId);
    await setDoc(rwdRef, fullRecord);

    // 2. Lock coupon in coupons collection so ONLY this user can redeem it
    if (reward.couponCode) {
      const couponRef = doc(db, 'coupons', reward.couponCode);
      const couponSnap = await getDoc(couponRef);
      if (couponSnap.exists()) {
        await updateDoc(couponRef, {
          scope: 'account_based',
          targetUserId: userId,
          targetUserEmail: (userEmail || '').trim().toLowerCase(),
        });
      }
    }
  } catch (err) {
    console.warn('saveWonRewardToUserVault warning:', err);
  }

  return fullRecord;
}

/**
 * Subscribe to a user's won rewards in real-time
 */
export function subscribeToUserWonRewards(
  userId: string,
  onUpdate: (rewards: WonRewardRecord[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }
  const q = collection(db, 'users', userId, 'won_rewards');
  return onSnapshot(q, (snap) => {
    const list: WonRewardRecord[] = [];
    snap.forEach((d) => {
      list.push(d.data() as WonRewardRecord);
    });
    list.sort((a, b) => new Date(b.wonAt).getTime() - new Date(a.wonAt).getTime());
    onUpdate(list);
  }, (err) => {
    console.warn('subscribeToUserWonRewards error:', err);
    onUpdate([]);
  });
}
