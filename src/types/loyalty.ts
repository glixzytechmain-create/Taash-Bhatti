/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RoyalRankId = 'shagird' | 'ustaad' | 'wazir' | 'badshah';

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

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  referralsEnabled: true,
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
