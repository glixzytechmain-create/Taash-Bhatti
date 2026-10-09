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
  UserLoyaltyState,
  CustomCardConfig,
  DEFAULT_CUSTOM_CARD_CONFIG,
  ReferralMilestoneStep,
  DEFAULT_MILESTONE_STEPS,
  ReferredFriendProgress
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
          milestoneSteps: Array.isArray(data.milestoneSteps) && data.milestoneSteps.length > 0
            ? data.milestoneSteps
            : DEFAULT_MILESTONE_STEPS,
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
        milestoneSteps: Array.isArray(data.milestoneSteps) && data.milestoneSteps.length > 0
          ? data.milestoneSteps
          : DEFAULT_MILESTONE_STEPS,
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
 * Synchronously retrieves or immediately creates a guaranteed referral code.
 * Ensures the UI never stalls on an empty string or 'GENERATING...'.
 */
export function getOrGenerateReferralCodeSync(user?: User | null, userId?: string): string {
  // 1. Direct profile field check
  if (user?.referralCode && user.referralCode.trim().length >= 4) {
    const clean = user.referralCode.trim().toUpperCase();
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('taashbhatti_user_referral_code', clean); } catch (e) {}
    }
    return clean;
  }

  // 2. Local storage cache check
  if (typeof localStorage !== 'undefined') {
    const cachedCode = localStorage.getItem('taashbhatti_user_referral_code');
    if (cachedCode && cachedCode.trim().length >= 4) {
      const clean = cachedCode.trim().toUpperCase();
      if (user) user.referralCode = clean;
      return clean;
    }
    const cachedProfile = localStorage.getItem('taashbhatti_cached_user_profile');
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile);
        if (parsed.referralCode && parsed.referralCode.trim().length >= 4) {
          const clean = parsed.referralCode.trim().toUpperCase();
          if (user) user.referralCode = clean;
          return clean;
        }
      } catch {}
    }
  }

  // 3. Generate instant guaranteed code
  const newCode = generateUserReferralCode(user);
  if (user) {
    user.referralCode = newCode;
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('taashbhatti_user_referral_code', newCode);
    } catch {}
  }
  return newCode;
}

/**
 * Ensures a user has a permanent referral code assigned and saved.
 * Resolves ID reliably across sessions, utilizes instant local caching,
 * and uses setDoc with merge to prevent document missing errors.
 */
export async function ensureUserReferralCode(user?: User | null, userId?: string): Promise<string> {
  const code = getOrGenerateReferralCodeSync(user, userId);

  // Background persist to Firestore if not already saved
  const targetUid = userId || user?.id || (user as any)?.uid || (typeof localStorage !== 'undefined' ? localStorage.getItem('taashbhatti_guest_user_id') : null);
  if (targetUid) {
    try {
      const userRef = doc(db, 'users', targetUid);
      setDoc(userRef, { referralCode: code }, { merge: true }).catch(() => {});
    } catch (e) {
      console.warn('Could not persist referral code in Firestore:', e);
    }
  }

  return code;
}

/**
 * Gets or initializes the user's custom referral card configuration.
 */
export function getUserCustomCard(user?: User | null): CustomCardConfig {
  if (user?.customCard && user.customCard.artStyle) {
    return {
      ...DEFAULT_CUSTOM_CARD_CONFIG,
      ...user.customCard,
      rank: user.customCard.rank || 'ace'
    };
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem('taashbhatti_custom_card');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.artStyle) {
          return {
            ...DEFAULT_CUSTOM_CARD_CONFIG,
            ...parsed,
            rank: parsed.rank || 'ace'
          };
        }
      }
    } catch (e) {}
  }

  return {
    ...DEFAULT_CUSTOM_CARD_CONFIG,
    patronTitle: user?.name ? `Nawab ${user.name.split(' ')[0]}` : 'Nawab of Bhatti',
    serialNumber: `#TB-${Math.floor(1000 + Math.random() * 9000)} • HERITAGE DECK`
  };
}

/**
 * Saves a user's customized referral card configuration.
 */
export async function saveUserCustomCard(
  userId: string,
  cardConfig: CustomCardConfig
): Promise<boolean> {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('taashbhatti_custom_card', JSON.stringify(cardConfig));
      ['taashbhatti_user_session', 'taashbhatti_cached_user_profile'].forEach((key) => {
        const cached = localStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.customCard = cardConfig;
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      });
      window.dispatchEvent(new CustomEvent('taashbhatti_card_customized', { detail: cardConfig }));
    } catch (e) {}
  }

  if (userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { customCard: cardConfig }, { merge: true });
      return true;
    } catch (e) {
      console.warn('Could not persist custom card in Firestore:', e);
    }
  }
  return true;
}

/**
 * Registers a new referee-to-referrer relationship in Firestore.
 */
export async function registerReferralRelationship({
  referrerCode,
  refereeUserId,
  refereeName,
  refereePhone,
  refereeEmail
}: {
  referrerCode: string;
  refereeUserId: string;
  refereeName?: string;
  refereePhone?: string;
  refereeEmail?: string;
}): Promise<{ success: boolean; referrerId?: string; error?: string }> {
  try {
    const cleanCode = (referrerCode || '').trim().toUpperCase();
    if (!cleanCode) return { success: false, error: 'No referral code provided.' };

    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('referralCode', '==', cleanCode));
    const snap = await getDocs(q);

    if (snap.empty) {
      return { success: false, error: 'Invalid referral code.' };
    }

    const referrerDoc = snap.docs[0];
    const referrerId = referrerDoc.id;

    if (referrerId === refereeUserId) {
      return { success: false, error: 'You cannot use your own referral code!' };
    }

    const referralDocId = `ref_${referrerId}_${refereeUserId}`;
    const referralRef = doc(db, 'referrals', referralDocId);
    const existingSnap = await getDoc(referralRef);

    if (!existingSnap.exists()) {
      const initialRecord: ReferredFriendProgress = {
        id: referralDocId,
        referrerUserId: referrerId,
        referrerCode: cleanCode,
        refereeUserId,
        refereeName: refereeName || 'New Royal Patron',
        refereePhone: refereePhone || '',
        refereeEmail: refereeEmail || '',
        joinedAt: new Date().toISOString(),
        completedOrdersCount: 0,
        claimedMilestones: [],
        totalEmbersEarned: 0,
        totalGoldenCashEarned: 0,
        freeDishesEarned: []
      };
      await setDoc(referralRef, initialRecord);
    }

    // Link on referee user doc
    const refereeRef = doc(db, 'users', refereeUserId);
    await setDoc(refereeRef, {
      referredByCode: cleanCode,
      referredByUserId: referrerId
    }, { merge: true });

    return { success: true, referrerId };
  } catch (err: any) {
    console.warn('Could not register referral relationship:', err);
    return { success: false, error: err?.message || 'Failed to register referral.' };
  }
}

/**
 * Real-time subscription to friends referred by this user.
 */
export function subscribeToUserReferrals(
  userId: string,
  callback: (friends: ReferredFriendProgress[]) => void
): () => void {
  if (!userId) {
    callback([]);
    return () => {};
  }
  const referralsCol = collection(db, 'referrals');
  const q = query(referralsCol, where('referrerUserId', '==', userId));
  const unsub = onSnapshot(
    q,
    (snapshot) => {
      const friends: ReferredFriendProgress[] = [];
      snapshot.forEach((d) => {
        friends.push({ id: d.id, ...d.data() } as ReferredFriendProgress);
      });
      friends.sort((a, b) => new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime());
      callback(friends);
    },
    (err) => {
      console.warn('Error subscribing to user referrals:', err);
      callback([]);
    }
  );
  return unsub;
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
 * Processes referrer progressive milestone rewards when referee's orders are delivered.
 * Supports 10 distinct order milestones per referred friend.
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
  milestonesAwarded?: number[];
  squadBountyUnlocked?: boolean;
}> {
  if (!config.referralsEnabled) {
    return { rewarded: false };
  }

  // 1. Identify referrer UID: either from order or from referee's user profile
  let referrerId = order.referrerUserId;
  let refereeId = order.userId;
  let refereeName = order.customerName || 'Friend';

  if (!referrerId && refereeId) {
    try {
      const refereeSnap = await getDoc(doc(db, 'users', refereeId));
      if (refereeSnap.exists()) {
        const u = refereeSnap.data() as User;
        referrerId = u.referredByUserId;
        if (u.name) refereeName = u.name;
      }
    } catch {}
  }

  if (!referrerId || !refereeId || referrerId === refereeId) {
    return { rewarded: false };
  }

  try {
    const referrerRef = doc(db, 'users', referrerId);
    const referrerSnap = await getDoc(referrerRef);
    if (!referrerSnap.exists()) return { rewarded: false };

    const refData = referrerSnap.data() as User;
    const referralDocId = `ref_${referrerId}_${refereeId}`;
    const referralRef = doc(db, 'referrals', referralDocId);
    const referralSnap = await getDoc(referralRef);

    let friendRecord: ReferredFriendProgress;
    if (referralSnap.exists()) {
      friendRecord = referralSnap.data() as ReferredFriendProgress;
    } else {
      friendRecord = {
        id: referralDocId,
        referrerUserId: referrerId,
        referrerCode: refData.referralCode || '',
        refereeUserId: refereeId,
        refereeName,
        refereePhone: order.customerPhone || (order as any).phone || '',
        joinedAt: new Date().toISOString(),
        completedOrdersCount: 0,
        claimedMilestones: [],
        totalEmbersEarned: 0,
        totalGoldenCashEarned: 0,
        freeDishesEarned: []
      };
    }

    // Increment completed order count for this specific friend
    const newOrderCount = (friendRecord.completedOrdersCount || 0) + 1;
    const claimedMilestones = Array.isArray(friendRecord.claimedMilestones) ? [...friendRecord.claimedMilestones] : [];
    
    // Milestones definition
    const milestoneSteps = Array.isArray(config.milestoneSteps) && config.milestoneSteps.length > 0
      ? config.milestoneSteps
      : DEFAULT_MILESTONE_STEPS;

    // Check which milestones are eligible to claim
    const newMilestonesAwarded: number[] = [];
    let standardEmbersToAdd = 0;
    let goldenCashToAdd = 0;
    const newFreeDishesEarned = [...(friendRecord.freeDishesEarned || [])];
    const newTxList: WalletTransaction[] = [];
    const newVouchers: any[] = [];

    for (const m of milestoneSteps) {
      if (newOrderCount >= m.ordersRequired && !claimedMilestones.includes(m.step)) {
        newMilestonesAwarded.push(m.step);
        claimedMilestones.push(m.step);

        if (m.rewardType === 'wallet_standard') {
          standardEmbersToAdd += m.amount;
          newTxList.push({
            id: `tx-milestone-${m.step}-${order.id.slice(-6)}-${Date.now()}`,
            type: 'credit',
            amount: m.amount,
            emberType: 'standard',
            description: `🎁 Step ${m.step} Milestone (${m.label}): Awarded for ${refereeName}'s Feast #${newOrderCount}`,
            orderId: order.id,
            createdAt: new Date().toISOString()
          });
        } else if (m.rewardType === 'wallet_golden') {
          goldenCashToAdd += m.amount;
          newTxList.push({
            id: `tx-milestone-${m.step}-${order.id.slice(-6)}-${Date.now()}`,
            type: 'credit',
            amount: m.amount,
            emberType: 'golden',
            description: `🎁 Step ${m.step} Milestone (${m.label}): Awarded for ${refereeName}'s Feast #${newOrderCount}`,
            orderId: order.id,
            createdAt: new Date().toISOString()
          });
        } else if (m.rewardType === 'free_dish') {
          const dishLabel = m.mealName || 'Free Gourmet Dish';
          newFreeDishesEarned.push(`${dishLabel} (Step ${m.step})`);
          newVouchers.push({
            id: `voucher-step-${m.step}-${Date.now()}`,
            couponCode: `PERK${m.step}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            title: `Complimentary ${dishLabel}`,
            description: `Unlocked via Step ${m.step} milestone for friend ${refereeName}'s Feast #${newOrderCount}!`,
            mealId: m.mealId,
            mealName: m.mealName,
            isUsed: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    // Check Squad Bounty (e.g. 4 friends completed at least 1 feast)
    let squadUnlocked = false;
    if (config.squadGoal.enabled && !refData.squadBountyClaimed && newOrderCount === 1) {
      const qFriends = query(collection(db, 'referrals'), where('referrerUserId', '==', referrerId));
      const friendsSnap = await getDocs(qFriends);
      let countWithOrders = 1; // including current
      friendsSnap.forEach(d => {
        const fr = d.data();
        if (fr.refereeUserId !== refereeId && (fr.completedOrdersCount || 0) >= 1) {
          countWithOrders++;
        }
      });
      if (countWithOrders >= config.squadGoal.targetReferrals) {
        squadUnlocked = true;
        const squadCash = config.squadGoal.rewardAmount || 1000;
        goldenCashToAdd += squadCash;
        newTxList.push({
          id: `tx-squad-goal-${Date.now()}`,
          type: 'credit',
          amount: squadCash,
          emberType: 'golden',
          description: `👑 Table of 4 Royal Feast Squad Bounty: 4 Friends Seated! Awarded ₹${squadCash} Golden Wallet Cash`,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Update friend record in Firestore
    const updatedRecord: ReferredFriendProgress = {
      ...friendRecord,
      completedOrdersCount: newOrderCount,
      lastOrderDate: new Date().toISOString(),
      claimedMilestones,
      totalEmbersEarned: (friendRecord.totalEmbersEarned || 0) + standardEmbersToAdd,
      totalGoldenCashEarned: (friendRecord.totalGoldenCashEarned || 0) + goldenCashToAdd,
      freeDishesEarned: newFreeDishesEarned
    };
    await setDoc(referralRef, updatedRecord, { merge: true });

    // Update referrer user document if rewards were earned
    if (newTxList.length > 0 || newVouchers.length > 0 || squadUnlocked) {
      const currentGolden = Number(refData.goldenEmberBalance || 0);
      const currentStandard = Number(refData.standardEmberBalance || 0);
      const currentTx: WalletTransaction[] = Array.isArray(refData.walletTransactions) ? refData.walletTransactions : [];
      const currentVouchers = Array.isArray((refData as any).wonRewards) ? (refData as any).wonRewards : [];

      const newGolden = currentGolden + goldenCashToAdd;
      const newStandard = currentStandard + standardEmbersToAdd;
      const newTotal = newGolden + newStandard;

      await setDoc(referrerRef, {
        goldenEmberBalance: newGolden,
        standardEmberBalance: newStandard,
        walletBalance: newTotal,
        walletTransactions: [...newTxList, ...currentTx],
        ...(newVouchers.length > 0 ? { wonRewards: [...newVouchers, ...currentVouchers] } : {}),
        ...(squadUnlocked ? { squadBountyClaimed: true } : {})
      }, { merge: true });
    }

    return {
      rewarded: newMilestonesAwarded.length > 0 || squadUnlocked,
      referrerId,
      milestonesAwarded: newMilestonesAwarded,
      squadBountyUnlocked: squadUnlocked
    };
  } catch (err) {
    console.warn('Could not process progressive referral milestones in Firestore:', err);
    return { rewarded: false };
  }
}
