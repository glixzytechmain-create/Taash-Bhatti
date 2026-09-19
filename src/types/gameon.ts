/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameType = 
  | 'roulette'       // Spin the Wheel of Flavors
  | 'scratch_card'   // Golden Handi Scratch & Win
  | 'coin_flip'      // Royal Taash Coin Toss
  | 'mystery_box'    // Clay Handi & Treasure Vault
  | 'memory_match'   // Turn-Based Culinary Card Pair Match
  | 'quick_quiz';    // 3-Question Timed Foodie Trivia

export interface GameOutcome {
  id: string;
  label: string;             // e.g. "50% OFF Handi Feast", "Free Delivery", "Better Luck Next Time"
  probabilityWeight: number; // e.g. 25 (means 25 / sum of weights)
  isWin: boolean;
  couponCode?: string;       // Existing coupon from 'coupons' collection
  rewardDescription?: string;// Short description shown on win
  badgeColor?: string;       // Hex or Tailwind color for wheel/card slice
  icon?: string;             // Emoji/Icon
}

export interface GameQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface MemoryCardPair {
  id: string;
  name: string;
  emoji: string;
  image?: string;
}

export interface GameConfig {
  id: string;                // Document ID in Firestore
  gameId: string;            // Permanent 6-digit unique code (e.g. "849201")
  title: string;             // e.g. "Weekend Handi Biryani Spin"
  subtitle?: string;
  gameType: GameType;
  isActive: boolean;
  maxTurnsPerSession: number;// e.g. 1, 3, 5
  dailyLimitPerDevice: number;// e.g. 1 per day
  description?: string;      // Patron rules
  outcomes: GameOutcome[];   // Outcomelist with probability weights & attached coupons
  quizQuestions?: GameQuizQuestion[]; // For quick_quiz games
  memoryPairs?: MemoryCardPair[];     // For memory match games
  totalPlays: number;
  totalWins: number;
  createdAt: string;
  updatedAt: string;
}

export interface WonRewardRecord {
  id: string;
  userId: string;
  gameId: string;
  gameTitle: string;
  gameType: GameType;
  couponCode: string;
  discountType: 'percentage' | 'fixed' | 'free_delivery' | 'free_perk';
  discountValue: number;
  perkName?: string;
  minOrderValue?: number;
  wonAt: string;
  expiryDate: string;
  isRedeemed: boolean;
  redeemedAt?: string;
}
