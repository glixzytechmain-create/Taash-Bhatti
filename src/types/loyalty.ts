/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RoyalRankId = 'shagird' | 'ustaad' | 'wazir' | 'badshah';

export type CardArtStyle = 
  | 'royal_gold'      // 24K Royal Gold Leaf & Obsidian
  | 'cyber_tandoor'   // Cyberpunk Tandoor & Neon Embers
  | 'charcoal_noir'   // Charcoal Noir & Rose Gold
  | 'bhatti_magma'    // Volcanic Bhatti Magma & Crimson
  | 'imperial_jade'   // Imperial Jade & Mughal Emerald
  | 'terracotta_dum'; // Vedic Terracotta & Earthen Handi

export type CardHouse = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type CardRankType = 'ace' | 'king' | 'queen' | 'jack' | 'joker';

export const CARD_RANKS: {
  id: CardRankType;
  symbol: string;
  name: string;
  rankBadge: string;
  rankLevel: number;
  tag: string;
  description: string;
  defaultTitle: string;
}[] = [
  {
    id: 'ace',
    symbol: 'A',
    name: 'Ace (Ikka)',
    rankBadge: 'RANK I • SOVEREIGN',
    rankLevel: 1,
    tag: 'Supreme Sovereign Ace',
    description: 'Supreme rank of the Bhatti deck. The singular sovereign flame.',
    defaultTitle: 'Sovereign of Bhatti'
  },
  {
    id: 'king',
    symbol: 'K',
    name: 'King (Badshah)',
    rankBadge: 'RANK II • HEARTH KING',
    rankLevel: 2,
    tag: 'Ruler of the Hearth',
    description: 'Master of the clay tandoor and commander of royal banquets.',
    defaultTitle: 'Badshah of the Hearth'
  },
  {
    id: 'queen',
    symbol: 'Q',
    name: 'Queen (Begum)',
    rankBadge: 'RANK III • EMPRESS',
    rankLevel: 3,
    tag: 'Empress of Saffron & Flavor',
    description: 'The keeper of secret saffron masalas and royal dawat hospitality.',
    defaultTitle: 'Begum of Royal Dawat'
  },
  {
    id: 'jack',
    symbol: 'J',
    name: 'Jack (Ghulam / Wazir)',
    rankBadge: 'RANK IV • KNIGHT',
    rankLevel: 4,
    tag: 'Valiant Charcoal Knight',
    description: 'Fearless guardian of authentic coal heat and iron skewers.',
    defaultTitle: 'Wazir of the Charcoal Guild'
  },
  {
    id: 'joker',
    symbol: '★',
    name: 'Joker (Bhatti Wildcard)',
    rankBadge: 'WILDCARD • JESTER',
    rankLevel: 5,
    tag: 'The Untamed Wildcard',
    description: 'Playful jester of spices that transforms any royal feast.',
    defaultTitle: 'Court Jester & Spice Trickster'
  }
];

export type CardVisualEffect = 
  | 'holographic'     // Dynamic rainbow angle shift
  | 'ember_particles' // Rising flame spark particles
  | 'gold_glint'      // Sweeping reflective glint
  | 'smoke_aura'      // Atmospheric charcoal smoke wisps
  | 'neon_pulse'      // Breathing thermal edge glow
  | 'none';

export interface CustomCardConfig {
  artStyle: CardArtStyle;
  house: CardHouse;
  rank: CardRankType; // 'ace' | 'king' | 'queen' | 'jack' | 'joker'
  visualEffect: CardVisualEffect;
  patronTitle: string; // e.g. "Nawab of Bhatti", "Grill Knight", "Feast Baron"
  customQuote?: string; // e.g. "Slow cooked over embers, shared with kings."
  serialNumber: string; // e.g. "#TB-0042 • MINT 2026"
  showQrOnFront: boolean;
}

export interface ReferralMilestoneStep {
  step: number; // 1 to 10
  ordersRequired: number; // 1 to 10
  rewardType: 'wallet_standard' | 'wallet_golden' | 'free_dish' | 'discount_voucher';
  amount: number; // Coins or Rupees
  mealId?: string; // active dish ID
  mealName?: string;
  label: string; // e.g. "50 Ember Coins", "Free Saffron Tandoori Paneer"
  description: string;
}

export interface ReferredFriendProgress {
  id: string; // referral doc ID (ref_referrerUid_refereeUid)
  referrerUserId: string;
  referrerCode: string;
  refereeUserId: string;
  refereeName: string;
  refereePhone?: string;
  refereeEmail?: string;
  refereeAvatar?: string;
  joinedAt: string;
  completedOrdersCount: number;
  lastOrderDate?: string;
  claimedMilestones: number[]; // e.g. [1, 2, 3]
  totalEmbersEarned: number;
  totalGoldenCashEarned: number;
  freeDishesEarned: string[];
}

export interface RoyalRankTier {
  id: RoyalRankId;
  title: string;
  subtitle: string;
  minOrders: number;
  cashbackMultiplier: number; // e.g. 1.0, 1.25, 1.5, 2.0
  badgeIcon: string;
  flameLevel: number; // 1 to 4 flame intensity
  perkSummary: string;
  freeDelivery: boolean;
  freeDishMealId?: string;
  freeDishMealName?: string;
}

export type ReferrerRewardType = 'wallet_golden' | 'wallet_standard' | 'free_dish' | 'discount_percentage';
export type RefereeRewardType = 'discount_flat' | 'wallet_credit' | 'free_dish';

export interface LoyaltyConfig {
  // Referrals
  referralsEnabled: boolean;
  milestoneSteps: ReferralMilestoneStep[]; // 10 progressive order milestones
  referrerReward: {
    type: ReferrerRewardType;
    amount: number; // e.g. 300 (for ₹300 Golden Wallet Cash)
    mealId?: string; // Valid meal ID from active menu
    mealName?: string;
    description: string;
  };
  refereeReward: {
    type: RefereeRewardType;
    amount: number; // e.g. 150 (for ₹150 OFF)
    minOrderValue: number; // e.g. 399
    mealId?: string;
    mealName?: string;
    description: string;
  };
  squadGoal: {
    enabled: boolean;
    targetReferrals: number; // e.g. 4 ("Table of 4")
    rewardType: 'wallet_golden' | 'free_dish';
    rewardAmount: number; // e.g. 1000
    mealId?: string; // e.g. 'm1' Saffron-Infused Tandoori Paneer Platter
    mealName?: string;
    title: string;
  };

  // Bhatti Heat Streak & Royal Ranks
  streakWindowDays: number; // e.g. 14 days between orders to keep flame burning
  royalRanks: RoyalRankTier[];

  // 5-Card Feast Poker Bounties
  pokerHands: {
    pair: {
      enabled: boolean;
      rewardType: 'wallet_standard' | 'wallet_golden';
      amount: number; // e.g. 50 Standard Embers
      label: string;
    };
    threeOfAKind: {
      enabled: boolean;
      rewardType: 'wallet_golden' | 'wallet_standard';
      amount: number; // e.g. 150 Golden Embers
      label: string;
    };
    flush: {
      enabled: boolean;
      rewardType: 'wallet_golden' | 'free_dish';
      amount: number; // e.g. 350 Golden Embers or Dish
      mealId?: string; // e.g. 'm3' Saffron Oats Shake
      mealName?: string;
      label: string;
    };
    royalFlush: {
      enabled: boolean;
      rewardType: 'wallet_golden' | 'free_dish';
      amount: number; // e.g. 1000 Golden Embers
      mealId?: string; // e.g. 'm1' Saffron-Infused Tandoori Paneer Platter
      mealName?: string;
      label: string;
    };
  };

  updatedAt: string;
  updatedBy?: string;
}

export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type CardRank = '10' | 'J' | 'Q' | 'K' | 'A';

export interface PokerCardItem {
  id: string;
  suit: CardSuit;
  rank: CardRank;
  dealtAt: string;
  orderId: string;
  isUsedInCombo?: boolean;
}

export interface ReferralRecord {
  id: string;
  referrerUserId: string;
  referrerCode: string;
  refereeUserId: string;
  refereeName?: string;
  refereePhone?: string;
  status: 'registered' | 'first_order_placed' | 'rewarded';
  orderId?: string;
  rewardClaimedAt?: string;
  createdAt: string;
}

export interface UserLoyaltyState {
  currentRank: RoyalRankTier;
  nextRank: RoyalRankTier | null;
  ordersNeededForNextRank: number;
  streakActive: boolean;
  daysRemainingInStreak: number;
  orderStreakCount: number;
  totalCompletedOrders: number;
  multiplier: number;
  userCards: PokerCardItem[];
  claimedCombos: string[];
}

export const DEFAULT_ROYAL_RANKS: RoyalRankTier[] = [
  {
    id: 'shagird',
    title: 'Shagird',
    subtitle: 'The Apprentice Griller',
    minOrders: 0,
    cashbackMultiplier: 1.0,
    badgeIcon: '🥉',
    flameLevel: 1,
    perkSummary: 'Standard 1.0x (10%) Ember token accrual on all orders.',
    freeDelivery: false,
  },
  {
    id: 'ustaad',
    title: 'Ustaad',
    subtitle: 'Master Tandoor Crafter',
    minOrders: 3,
    cashbackMultiplier: 1.25,
    badgeIcon: '🥈',
    flameLevel: 2,
    perkSummary: '1.25x Boosted Ember cashback + Priority KDS kitchen queue.',
    freeDelivery: false,
  },
  {
    id: 'wazir',
    title: 'Wazir',
    subtitle: 'Grand Minister of Feasts',
    minOrders: 7,
    cashbackMultiplier: 1.5,
    badgeIcon: '🥇',
    flameLevel: 3,
    perkSummary: '1.5x Scalding Ember cashback + Complimentary chef beverage perk.',
    freeDelivery: false,
    freeDishMealId: 'm3',
    freeDishMealName: 'Saffron Oats & Almond Delight Shake',
  },
  {
    id: 'badshah',
    title: 'Badshah',
    subtitle: 'The Taash Bhatti Sovereign',
    minOrders: 15,
    cashbackMultiplier: 2.0,
    badgeIcon: '👑',
    flameLevel: 4,
    perkSummary: '2.0x Double Ember cashback + Permanent Zero Delivery Fee on every feast.',
    freeDelivery: true,
    freeDishMealId: 'm1',
    freeDishMealName: 'Saffron-Infused Tandoori Paneer Platter',
  },
];

export const DEFAULT_MILESTONE_STEPS: ReferralMilestoneStep[] = [
  {
    step: 1,
    ordersRequired: 1,
    rewardType: 'wallet_standard',
    amount: 50,
    label: '50 Standard Embers',
    description: 'Awarded when friend completes their 1st feast delivery.'
  },
  {
    step: 2,
    ordersRequired: 2,
    rewardType: 'wallet_standard',
    amount: 50,
    label: '50 Standard Embers',
    description: 'Awarded when friend completes their 2nd feast delivery.'
  },
  {
    step: 3,
    ordersRequired: 3,
    rewardType: 'free_dish',
    amount: 349,
    mealId: 'm1',
    mealName: 'Saffron-Infused Tandoori Paneer Platter',
    label: 'Free Gourmet Dish (Next Order)',
    description: 'Complimentary signature platter reward on your next order.'
  },
  {
    step: 4,
    ordersRequired: 4,
    rewardType: 'wallet_standard',
    amount: 75,
    label: '75 Standard Embers',
    description: 'Awarded when friend completes their 4th feast.'
  },
  {
    step: 5,
    ordersRequired: 5,
    rewardType: 'wallet_golden',
    amount: 100,
    label: '₹100 Golden Wallet Cash',
    description: 'Direct 100% bill-applicable Golden Cash credit.'
  },
  {
    step: 6,
    ordersRequired: 6,
    rewardType: 'wallet_standard',
    amount: 100,
    label: '100 Standard Embers',
    description: 'Awarded when friend completes their 6th feast.'
  },
  {
    step: 7,
    ordersRequired: 7,
    rewardType: 'free_dish',
    amount: 249,
    mealId: 'm3',
    mealName: 'Saffron Oats & Almond Delight Shake',
    label: 'Free Gourmet Shake Perk',
    description: 'Complimentary delight shake voucher on your next feast.'
  },
  {
    step: 8,
    ordersRequired: 8,
    rewardType: 'wallet_standard',
    amount: 150,
    label: '150 Standard Embers',
    description: 'Awarded when friend completes their 8th feast.'
  },
  {
    step: 9,
    ordersRequired: 9,
    rewardType: 'wallet_golden',
    amount: 200,
    label: '₹200 Golden Wallet Cash',
    description: 'Direct 100% bill-applicable Golden Cash credit.'
  },
  {
    step: 10,
    ordersRequired: 10,
    rewardType: 'wallet_golden',
    amount: 500,
    mealId: 'm1',
    mealName: 'Saffron-Infused Tandoori Paneer Platter',
    label: '₹500 Grand Royal Bounty',
    description: 'The ultimate 10-Feast Sovereign Bounty credited to your wallet.'
  }
];

export const DEFAULT_CUSTOM_CARD_CONFIG: CustomCardConfig = {
  artStyle: 'royal_gold',
  house: 'spades',
  rank: 'ace',
  visualEffect: 'holographic',
  patronTitle: 'Nawab of Bhatti',
  customQuote: 'Slow cooked over embers, shared with kings.',
  serialNumber: '#TB-0001 • HERITAGE DECK',
  showQrOnFront: false
};

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  referralsEnabled: true,
  milestoneSteps: DEFAULT_MILESTONE_STEPS,
  referrerReward: {
    type: 'wallet_golden',
    amount: 300,
    description: '₹300 Golden Wallet Cash credited upon friend’s 1st delivered feast',
  },
  refereeReward: {
    type: 'discount_flat',
    amount: 150,
    minOrderValue: 399,
    description: 'Flat ₹150 OFF on your inaugural order of ₹399+',
  },
  squadGoal: {
    enabled: true,
    targetReferrals: 4,
    rewardType: 'wallet_golden',
    rewardAmount: 1000,
    mealId: 'm1',
    mealName: 'Saffron-Infused Tandoori Paneer Platter',
    title: 'Table of 4 Royal Feast Bounty',
  },
  streakWindowDays: 14,
  royalRanks: DEFAULT_ROYAL_RANKS,
  pokerHands: {
    pair: {
      enabled: true,
      rewardType: 'wallet_standard',
      amount: 50,
      label: '50 Standard Embers (One Pair)',
    },
    threeOfAKind: {
      enabled: true,
      rewardType: 'wallet_golden',
      amount: 150,
      label: '₹150 Golden Wallet Cash (Three of a Kind)',
    },
    flush: {
      enabled: true,
      rewardType: 'wallet_golden',
      amount: 350,
      mealId: 'm3',
      mealName: 'Saffron Oats & Almond Delight Shake',
      label: '₹350 Golden Wallet Cash (5-Card Flush)',
    },
    royalFlush: {
      enabled: true,
      rewardType: 'wallet_golden',
      amount: 1000,
      mealId: 'm1',
      mealName: 'Saffron-Infused Tandoori Paneer Platter',
      label: '₹1,000 Royal Feast Cash (Royal Flush)',
    },
  },
  updatedAt: new Date().toISOString(),
};
