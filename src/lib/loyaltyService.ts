/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  setDoc, 
  updateDoc, 
  where 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  LoyaltyConfig, 
  DEFAULT_LOYALTY_CONFIG, 
  DEFAULT_ROYAL_RANKS, 
  RoyalRankTier, 
  PokerCardItem, 
  CardSuit, 
  CardRank, 
  UserLoyaltyState 
} from '../types/loyalty';
import { Order, User, WalletTransaction } from '../types';

const LOYALTY_CONFIG_DOC = 'settings';
const LOYALTY_CONFIG_COL = 'loyalty_config';

/**
 * Subscribes in real-time to the loyalty configuration singleton.
 */
export function subscribeToLoyaltyConfig(callback: (config: LoyaltyConfig) => void): () => void {
  const docRef = doc(db, LOYALTY_CONFIG_COL, LOYALTY_CONFIG_DOC);
  const unsubscribe = onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<LoyaltyConfig>;
        callback({
          ...DEFAULT_LOYALTY_CONFIG,
          ...data,
          royalRanks: Array.isArray(data.royalRanks) && data.royalRanks.length > 0 
            ? data.royalRanks 
            : DEFAULT_ROYAL_RANKS,
          pokerHands: {
            ...DEFAULT_LOYALTY_CONFIG.pokerHands,
            ...(data.pokerHands || {})
          }
        });
      } else {
        // Document does not exist yet; provide default
        callback(DEFAULT_LOYALTY_CONFIG);
      }
    },
    (err) => {
      console.warn('Loyalty config snapshot warning:', err);
      callback(DEFAULT_LOYALTY_CONFIG);
    }
  );

  return unsubscribe;
}

/**
 * One-shot fetch for loyalty configuration.
 */
export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  try {
    const docRef = doc(db, LOYALTY_CONFIG_COL, LOYALTY_CONFIG_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<LoyaltyConfig>;
      return {
        ...DEFAULT_LOYALTY_CONFIG,
        ...data,
        royalRanks: Array.isArray(data.royalRanks) && data.royalRanks.length > 0 
          ? data.royalRanks 
          : DEFAULT_ROYAL_RANKS,
        pokerHands: {
          ...DEFAULT_LOYALTY_CONFIG.pokerHands,
          ...(data.pokerHands || {})
        }
      };
    }
  } catch (e) {
    console.warn('Failed to fetch loyalty config from Firestore:', e);
  }
  return DEFAULT_LOYALTY_CONFIG;
}

/**
 * Admin action to save modified loyalty configuration.
 */
export async function saveLoyaltyConfig(config: LoyaltyConfig, adminEmail?: string): Promise<boolean> {
  try {
    const docRef = doc(db, LOYALTY_CONFIG_COL, LOYALTY_CONFIG_DOC);
    const payload: LoyaltyConfig = {
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: adminEmail || 'admin@taashbhatti.com'
    };
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (e) {
    console.error('Failed to save loyalty config in Firestore:', e);
    return false;
  }
}

/**
 * Generates an alphanumeric referral code, e.g. TB-KABIR77
 */
export function generateUserReferralCode(user?: { name?: string; email?: string } | null): string {
  let base = 'PATRON';
  if (user?.name && user.name.trim().length > 0) {
    base = user.name.trim().replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
  } else if (user?.email && user.email.includes('@')) {
    base = user.email.split('@')[0].replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
  }
  if (!base || base.length < 3) base = 'BHATTI';
  const randomSuffix = Math.floor(10 + Math.random() * 90); // 2-digit number
  return `TB-${base}${randomSuffix}`;
}

/**
 * Ensures a user has a permanent referral code assigned and saved.
 */
export async function ensureUserReferralCode(user: User, userId: string): Promise<string> {
  if (user.referralCode && user.referralCode.trim().length > 3) {
    return user.referralCode;
  }

  const newCode = generateUserReferralCode(user);
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { referralCode: newCode });
    user.referralCode = newCode;
    
    // Update local cache
    try {
      ['taashbhatti_user_session', 'taashbhatti_cached_user_profile'].forEach((key) => {
        const cached = localStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.referralCode = newCode;
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      });
    } catch {}
  } catch (e) {
    console.warn('Could not persist referral code in Firestore:', e);
  }
  return newCode;
}

/**
 * Validates a referral code entered at checkout or via link.
 */
export async function validateReferralCode({
  code,
  currentUserId,
  cartSubtotal = 0,
  config
}: {
  code: string;
  currentUserId?: string;
  cartSubtotal?: number;
  config: LoyaltyConfig;
}): Promise<{
  valid: boolean;
  discountAmount: number;
  errorReason?: string;
  referrerUser?: { id: string; name: string; referralCode: string };
}> {
  if (!config.referralsEnabled) {
    return { valid: false, discountAmount: 0, errorReason: 'Referral program is currently paused by admin.' };
  }

  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode || cleanCode.length < 4) {
    return { valid: false, discountAmount: 0, errorReason: 'Please enter a valid referral code.' };
  }

  try {
    // 1. Query user with this referral code
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('referralCode', '==', cleanCode));
    const snap = await getDocs(q);

    if (snap.empty) {
      return { valid: false, discountAmount: 0, errorReason: 'Invalid referral code. No account matched this code.' };
    }

    const matchedDoc = snap.docs[0];
    const referrerData = matchedDoc.data() as User;
    const referrerId = matchedDoc.id;

    // 2. Prevent self-referral
    if (currentUserId && (currentUserId === referrerId || currentUserId === referrerData.id)) {
      return { valid: false, discountAmount: 0, errorReason: 'You cannot use your own referral code!' };
    }

    // 3. Check Minimum Order Value (MOV)
    const requiredMov = config.refereeReward.minOrderValue || 0;
    if (cartSubtotal < requiredMov) {
      return {
        valid: false,
        discountAmount: 0,
        errorReason: `Minimum order value of ₹${requiredMov} required to redeem friend referral perk.`
      };
    }

    // 4. Calculate discount
    const discountAmount = config.refereeReward.type === 'discount_flat' 
      ? config.refereeReward.amount 
      : 0;

    return {
      valid: true,
      discountAmount,
      referrerUser: {
        id: referrerId,
        name: referrerData.name || 'Your Friend',
        referralCode: cleanCode
      }
    };
  } catch (err: any) {
    console.error('Error validating referral code:', err);
    return { valid: false, discountAmount: 0, errorReason: 'Unable to verify referral code at this moment.' };
  }
}

/**
 * Calculates user's Royal Rank, flame streak, cashback multiplier, and streak timer.
 */
export function calculateUserLoyaltyState(
  orders: Order[] = [],
  config: LoyaltyConfig,
  user?: User | null
): UserLoyaltyState {
  const completedOrders = orders.filter((o) => o.status === 'delivered');
  const count = completedOrders.length;

  // Streak timer calculation
  let streakActive = false;
  let daysRemainingInStreak = 0;
  const streakWindowDays = Math.max(1, config.streakWindowDays || 14);

  if (completedOrders.length > 0) {
    // Sort descending by date
    const sorted = [...completedOrders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestDate = new Date(sorted[0].date).getTime();
    const now = Date.now();
    const diffMs = now - latestDate;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays <= streakWindowDays) {
      streakActive = true;
      daysRemainingInStreak = Math.max(0, Math.ceil(streakWindowDays - diffDays));
    }
  }

  // Find rank
  const ranks = [...(config.royalRanks || DEFAULT_ROYAL_RANKS)].sort((a, b) => a.minOrders - b.minOrders);
  let currentRank = ranks[0];
  let nextRank: RoyalRankTier | null = null;

  for (let i = 0; i < ranks.length; i++) {
    if (count >= ranks[i].minOrders) {
      currentRank = ranks[i];
      nextRank = ranks[i + 1] || null;
    }
  }

  const ordersNeededForNextRank = nextRank ? Math.max(0, nextRank.minOrders - count) : 0;
  const multiplier = streakActive || count === 0 
    ? currentRank.cashbackMultiplier 
    : 1.0; // If streak expired and not novice, multiplier cools down to 1.0x

  const userCards: PokerCardItem[] = Array.isArray(user?.pokerCards) ? user!.pokerCards : [];
  const claimedCombos: string[] = Array.isArray(user?.claimedCombos) ? user!.claimedCombos : [];

  return {
    currentRank,
    nextRank,
    ordersNeededForNextRank,
    streakActive: count === 0 ? true : streakActive,
    daysRemainingInStreak,
    orderStreakCount: user?.orderStreakCount || (streakActive ? count : 0),
    totalCompletedOrders: count,
    multiplier,
    userCards,
    claimedCombos
  };
}

/**
 * Deals 1 playing card to the user when an order is delivered.
 */
export async function dealCardForDeliveredOrder(
  order: Order,
  userId?: string
): Promise<PokerCardItem | null> {
  const targetUid = userId || order.userId;
  if (!targetUid) return null;

  const suits: CardSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const ranks: CardRank[] = ['10', 'J', 'Q', 'K', 'A'];

  const randomSuit = suits[Math.floor(Math.random() * suits.length)];
  const randomRank = ranks[Math.floor(Math.random() * ranks.length)];

  const newCard: PokerCardItem = {
    id: `card-${order.id.slice(-6)}-${Date.now()}`,
    suit: randomSuit,
    rank: randomRank,
    dealtAt: new Date().toISOString(),
    orderId: order.id,
    isUsedInCombo: false
  };

  try {
    const userRef = doc(db, 'users', targetUid);
    const userSnap = await getDoc(userRef);
    let existingCards: PokerCardItem[] = [];

    if (userSnap.exists()) {
      const uData = userSnap.data() as User;
      existingCards = Array.isArray(uData.pokerCards) ? uData.pokerCards : [];
    }

    const updatedCards = [newCard, ...existingCards];

    await updateDoc(userRef, {
      pokerCards: updatedCards
    });

    // Also link card to the order
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        pokerCardAwarded: newCard
      });
    } catch {}

    return newCard;
  } catch (err) {
    console.warn('Could not deal card for delivered order:', err);
    return null;
  }
}

/**
 * Evaluates active poker hands from available cards.
 */
export function evaluatePokerHands(cards: PokerCardItem[], config: LoyaltyConfig) {
  const available = cards.filter((c) => !c.isUsedInCombo);

  // Frequency by rank
  const rankCounts: Record<string, number> = {};
  // Frequency by suit
  const suitCounts: Record<string, number> = {};

  available.forEach((c) => {
    rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
    suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
  });

  const hasPair = Object.values(rankCounts).some((count) => count >= 2);
  const hasThreeOfAKind = Object.values(rankCounts).some((count) => count >= 3);
  const hasFlush = Object.values(suitCounts).some((count) => count >= 5);

  // Check Royal Flush (10, J, Q, K, A in the same suit)
  let hasRoyalFlush = false;
  const royalRanksNeeded: CardRank[] = ['10', 'J', 'Q', 'K', 'A'];
  for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as CardSuit[]) {
    const suitCards = available.filter((c) => c.suit === suit);
    const suitRanks = new Set(suitCards.map((c) => c.rank));
    if (royalRanksNeeded.every((r) => suitRanks.has(r))) {
      hasRoyalFlush = true;
      break;
    }
  }

  const combos = [
    {
      id: 'pair',
      title: 'One Pair (2 matching cards)',
      isEligible: hasPair && config.pokerHands.pair.enabled,
      rewardType: config.pokerHands.pair.rewardType,
      amount: config.pokerHands.pair.amount,
      label: config.pokerHands.pair.label,
      cardsNeeded: 2
    },
    {
      id: 'threeOfAKind',
      title: 'Three of a Kind (3 matching cards)',
      isEligible: hasThreeOfAKind && config.pokerHands.threeOfAKind.enabled,
      rewardType: config.pokerHands.threeOfAKind.rewardType,
      amount: config.pokerHands.threeOfAKind.amount,
      label: config.pokerHands.threeOfAKind.label,
      cardsNeeded: 3
    },
    {
      id: 'flush',
      title: 'Royal Flush / 5-Card Suit',
      isEligible: hasFlush && config.pokerHands.flush.enabled,
      rewardType: config.pokerHands.flush.rewardType,
      amount: config.pokerHands.flush.amount,
      label: config.pokerHands.flush.label,
      cardsNeeded: 5
    },
    {
      id: 'royalFlush',
      title: 'Grand Royal Flush (10, J, Q, K, A same suit)',
      isEligible: hasRoyalFlush && config.pokerHands.royalFlush.enabled,
      rewardType: config.pokerHands.royalFlush.rewardType,
      amount: config.pokerHands.royalFlush.amount,
      label: config.pokerHands.royalFlush.label,
      cardsNeeded: 5
    }
  ];

  return {
    combos,
    totalAvailableCards: available.length,
    hasAnyClaimable: combos.some((c) => c.isEligible)
  };
}

/**
 * Claims a poker hand combination reward and credits the user's wallet.
 */
export async function claimPokerBounty({
  userId,
  comboId,
  config
}: {
  userId: string;
  comboId: 'pair' | 'threeOfAKind' | 'flush' | 'royalFlush';
  config: LoyaltyConfig;
}): Promise<{ success: boolean; message: string; amountAwarded: number }> {
  if (!userId) return { success: false, message: 'User not signed in', amountAwarded: 0 };

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return { success: false, message: 'User account not found', amountAwarded: 0 };

    const uData = userSnap.data() as User;
    const cards: PokerCardItem[] = Array.isArray(uData.pokerCards) ? uData.pokerCards : [];
    const evaluation = evaluatePokerHands(cards, config);
    const targetCombo = evaluation.combos.find((c) => c.id === comboId);

    if (!targetCombo || !targetCombo.isEligible) {
      return { success: false, message: 'You do not have the required cards for this hand combination yet.', amountAwarded: 0 };
    }

    // Mark cards as used
    let cardsToMark = targetCombo.cardsNeeded;
    const updatedCards = cards.map((c) => {
      if (!c.isUsedInCombo && cardsToMark > 0) {
        cardsToMark--;
        return { ...c, isUsedInCombo: true };
      }
      return c;
    });

    const isGolden = targetCombo.rewardType === 'wallet_golden';
    const amount = Number(targetCombo.amount || 0);

    let currentGolden = Number(uData.goldenEmberBalance || 0);
    let currentStandard = Number(uData.standardEmberBalance || 0);
    const currentTx: WalletTransaction[] = Array.isArray(uData.walletTransactions) ? uData.walletTransactions : [];

    if (isGolden) {
      currentGolden += amount;
    } else {
      currentStandard += amount;
    }
    const newTotal = currentGolden + currentStandard;

    const newTx: WalletTransaction = {
      id: `tx-poker-${comboId}-${Date.now()}`,
      type: 'credit',
      amount,
      emberType: isGolden ? 'golden' : 'standard',
      description: `🃏 5-Card Feast Poker Bounty: Claimed ${targetCombo.title}`,
      createdAt: new Date().toISOString()
    };

    const claimedList = Array.isArray(uData.claimedCombos) ? uData.claimedCombos : [];

    await updateDoc(userRef, {
      pokerCards: updatedCards,
      goldenEmberBalance: currentGolden,
      standardEmberBalance: currentStandard,
      walletBalance: newTotal,
      walletTransactions: [newTx, ...currentTx],
      claimedCombos: [...claimedList, `${comboId}-${Date.now()}`]
    });

    return {
      success: true,
      message: `Bounty claimed! Credited ₹${amount} in ${isGolden ? 'Golden Embers' : 'Standard Embers'}.`,
      amountAwarded: amount
    };
  } catch (err: any) {
    console.error('Error claiming poker bounty:', err);
    return { success: false, message: err?.message || 'Failed to claim bounty.', amountAwarded: 0 };
  }
}

/**
 * Processes referrer reward when referee's first order is delivered.
 */
export async function processReferralOnOrderDelivered({
  order,
  config
}: {
  order: Order;
  config: LoyaltyConfig;
}): Promise<{
  rewarded: boolean;
  referrerId?: string;
  squadBountyUnlocked?: boolean;
}> {
  if (!config.referralsEnabled || !order.referrerUserId) {
    return { rewarded: false };
  }

  const referrerId = order.referrerUserId;
  const rewardAmount = config.referrerReward.amount || 300;

  try {
    const referrerRef = doc(db, 'users', referrerId);
    const referrerSnap = await getDoc(referrerRef);
    if (!referrerSnap.exists()) return { rewarded: false };

    const refData = referrerSnap.data() as User;
    const currentGolden = Number(refData.goldenEmberBalance || 0);
    const currentStandard = Number(refData.standardEmberBalance || 0);
    const currentTx: WalletTransaction[] = Array.isArray(refData.walletTransactions) ? refData.walletTransactions : [];
    const successfulCount = (refData.successfulReferralCount || 0) + 1;

    // Credit referrer with configured reward
    const newGolden = currentGolden + rewardAmount;
    const newTotal = newGolden + currentStandard;

    const rewardTx: WalletTransaction = {
      id: `tx-ref-bonus-${order.id.slice(-6)}-${Date.now()}`,
      type: 'credit',
      amount: rewardAmount,
      emberType: 'golden',
      description: `🎁 ₹${rewardAmount} Bhatti Golden Wallet Cash: Friend Referral Bonus for Order #${order.id.slice(-6)}`,
      orderId: order.id,
      createdAt: new Date().toISOString()
    };

    let squadUnlocked = false;
    let extraTxList: WalletTransaction[] = [rewardTx];
    let finalGolden = newGolden;

    // Check "Table of 4" Squad Goal
    if (
      config.squadGoal.enabled &&
      successfulCount >= config.squadGoal.targetReferrals &&
      !refData.squadBountyClaimed
    ) {
      squadUnlocked = true;
      const squadCash = config.squadGoal.rewardAmount || 1000;
      finalGolden += squadCash;

      const squadTx: WalletTransaction = {
        id: `tx-squad-goal-${Date.now()}`,
        type: 'credit',
        amount: squadCash,
        emberType: 'golden',
        description: `👑 Table of 4 Royal Feast Squad Bounty: 4 Friends Seated! Awarded ₹${squadCash} Golden Wallet Cash`,
        createdAt: new Date().toISOString()
      };
      extraTxList.push(squadTx);
    }

    await updateDoc(referrerRef, {
      goldenEmberBalance: finalGolden,
      walletBalance: finalGolden + currentStandard,
      walletTransactions: [...extraTxList, ...currentTx],
      successfulReferralCount: successfulCount,
      ...(squadUnlocked ? { squadBountyClaimed: true } : {})
    });

    return {
      rewarded: true,
      referrerId,
      squadBountyUnlocked: squadUnlocked
    };
  } catch (err) {
    console.warn('Could not award referral bonus in Firestore:', err);
    return { rewarded: false };
  }
}
