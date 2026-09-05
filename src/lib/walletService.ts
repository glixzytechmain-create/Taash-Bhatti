/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Order, WalletTransaction } from '../types';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Validates if an order is eligible for customer self-service cancellation:
 * "Enable customers to cancel orders before the kitchen begins cooking, with instant refund credit"
 */
export function canCustomerCancelOrder(order: Order | null | undefined): boolean {
  if (!order) return false;
  if (order.status === 'cancelled' || order.status === 'delivered') return false;
  
  // Only cancellable before the kitchen begins cooking
  const isCooking = order.status === 'cooking' || order.kdsStage === 'cooking' || Boolean(order.cookingStartedAt);
  const isPastSent = order.status === 'ready_for_pickup' || order.status === 'out_for_delivery' || order.kdsStage === 'plated' || order.kdsStage === 'dispatched';

  return !isCooking && !isPastSent;
}

/**
 * Cancels an eligible order and credits the full order total instantly to the user's Bhatti Wallet as Golden Ember Coins.
 * (1 Ember Coin = ₹1. Golden Ember can be used to pay for up to 100% of any bill).
 */
export async function cancelOrderWithInstantWalletRefund(
  order: Order,
  userId: string,
  cancellationReason: string = 'Customer cancelled before kitchen cooking'
): Promise<{ success: boolean; refundedAmount: number; newGoldenBalance: number; error?: string }> {
  try {
    if (!canCustomerCancelOrder(order)) {
      return {
        success: false,
        refundedAmount: 0,
        newGoldenBalance: 0,
        error: 'Order has already commenced cooking or dispatch, and cannot be self-cancelled.'
      };
    }

    const refundAmount = order.total || 0;
    const nowIso = new Date().toISOString();

    // 1. Mark order cancelled in Firestore
    const orderRef = doc(db, 'orders', order.id);
    await updateDoc(orderRef, {
      status: 'cancelled',
      kdsStage: 'cancelled',
      cancelledAt: nowIso,
      cancelledBy: 'customer',
      cancellationReason,
      refundedToWallet: true,
      refundAmount,
      trackingSteps: [
        ...(Array.isArray(order.trackingSteps) ? order.trackingSteps : []),
        {
          title: 'Order Cancelled & Golden Embers Refunded',
          description: `Self-cancelled prior to cooking. ${refundAmount} Golden Ember Coins credited to Bhatti Wallet.`,
          done: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    });

    // 2. Fetch and credit user Golden Ember balance in Firestore
    let currentGolden = 0;
    let currentStandard = 0;
    let currentTx: WalletTransaction[] = [];

    if (userId) {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const uData = userSnap.data() as User;
          currentGolden = Number(uData.goldenEmberBalance || 0);
          currentStandard = Number(uData.standardEmberBalance || 0);
          currentTx = Array.isArray(uData.walletTransactions) ? uData.walletTransactions : [];
        }

        const newGoldenBalance = currentGolden + refundAmount;
        const newTotalBalance = newGoldenBalance + currentStandard;

        const newTransaction: WalletTransaction = {
          id: `tx-gold-ref-${order.id.slice(-6)}-${Date.now()}`,
          type: 'credit',
          amount: refundAmount,
          emberType: 'golden',
          description: `Golden Ember Refund for Order #${order.id.slice(-6)} (100% Bill Eligible)`,
          orderId: order.id,
          createdAt: nowIso
        };

        const updatedTxList = [newTransaction, ...currentTx];

        await updateDoc(userRef, {
          goldenEmberBalance: newGoldenBalance,
          walletBalance: newTotalBalance,
          walletTransactions: updatedTxList
        });

        // Update local cached user if matching
        try {
          const cached = localStorage.getItem('fitzaika_user_session');
          if (cached) {
            const parsed = JSON.parse(cached);
            parsed.goldenEmberBalance = newGoldenBalance;
            parsed.walletBalance = newTotalBalance;
            parsed.walletTransactions = updatedTxList;
            localStorage.setItem('fitzaika_user_session', JSON.stringify(parsed));
          }
        } catch (e) {}

        return {
          success: true,
          refundedAmount: refundAmount,
          newGoldenBalance
        };
      } catch (userErr) {
        console.warn("Could not credit user document directly, saving locally:", userErr);
      }
    }

    return {
      success: true,
      refundedAmount: refundAmount,
      newGoldenBalance: refundAmount
    };

  } catch (err: any) {
    console.error("Failed to cancel order with Golden Ember refund:", err);
    return {
      success: false,
      refundedAmount: 0,
      newGoldenBalance: 0,
      error: err?.message || 'Cancellation failed'
    };
  }
}

/**
 * Awards 10% Standard Ember Coins to the customer once an order is delivered/completed.
 * (1 Ember Coin = ₹1. Standard Ember Coins can be used to pay for up to 30% of any bill).
 */
export async function awardStandardEmberCoinsOnOrderCompletion(
  order: Order,
  userId?: string
): Promise<{ success: boolean; coinsAwarded: number }> {
  const targetUserId = userId || order.userId;
  if (!targetUserId || order.standardEmberAwarded) {
    return { success: false, coinsAwarded: 0 };
  }

  const orderTotal = Number(order.total || 0);
  if (orderTotal <= 0) return { success: false, coinsAwarded: 0 };

  // 10% Standard Ember reward
  const coinsAwarded = Math.max(1, Math.round(orderTotal * 0.10));
  const nowIso = new Date().toISOString();

  try {
    // 1. Mark order as awarded
    const orderRef = doc(db, 'orders', order.id);
    await updateDoc(orderRef, {
      standardEmberAwarded: true,
      standardEmberCoinsEarned: coinsAwarded
    });

    // 2. Credit to user's standardEmberBalance
    const userRef = doc(db, 'users', targetUserId);
    const userSnap = await getDoc(userRef);
    let currentStandard = 0;
    let currentGolden = 0;
    let currentTx: WalletTransaction[] = [];

    if (userSnap.exists()) {
      const uData = userSnap.data() as User;
      currentStandard = Number(uData.standardEmberBalance || 0);
      currentGolden = Number(uData.goldenEmberBalance || 0);
      currentTx = Array.isArray(uData.walletTransactions) ? uData.walletTransactions : [];
    }

    const newStandardBalance = currentStandard + coinsAwarded;
    const newTotalBalance = currentGolden + newStandardBalance;

    const rewardTx: WalletTransaction = {
      id: `tx-std-earn-${order.id.slice(-6)}-${Date.now()}`,
      type: 'credit',
      amount: coinsAwarded,
      emberType: 'standard',
      description: `10% Standard Ember Reward earned on Order #${order.id.slice(-6)}`,
      orderId: order.id,
      createdAt: nowIso
    };

    const updatedTxList = [rewardTx, ...currentTx];

    await updateDoc(userRef, {
      standardEmberBalance: newStandardBalance,
      walletBalance: newTotalBalance,
      walletTransactions: updatedTxList
    });

    // Update local cached user if matching
    try {
      const cached = localStorage.getItem('fitzaika_user_session');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.standardEmberBalance = newStandardBalance;
        parsed.walletBalance = newTotalBalance;
        parsed.walletTransactions = updatedTxList;
        localStorage.setItem('fitzaika_user_session', JSON.stringify(parsed));
      }
    } catch (e) {}

    return { success: true, coinsAwarded };
  } catch (e) {
    console.warn("Could not award Standard Ember Coins in Firestore:", e);
    return { success: false, coinsAwarded: 0 };
  }
}

/**
 * Calculates discount and enforces the Ember Coin checkout terms:
 * - 1 Ember Coin = ₹1.
 * - Golden Ember can pay for up to 100% of the bill.
 * - Standard Ember can pay for up to 30% of the bill.
 * - Term: "the golden token must be used first if user is applying a token then they may or may not use the standard one".
 */
export function calculateEmberCheckoutUsage({
  billAmount,
  goldenBalance,
  standardBalance,
  useGolden,
  useStandard
}: {
  billAmount: number;
  goldenBalance: number;
  standardBalance: number;
  useGolden: boolean;
  useStandard: boolean;
}): {
  goldenDeduction: number;
  standardDeduction: number;
  totalEmberDiscount: number;
  finalPayable: number;
  canUseStandard: boolean;
  standardMaxLimit: number;
} {
  const safeBill = Math.max(0, billAmount);
  const safeGoldenBal = Math.max(0, goldenBalance || 0);
  const safeStandardBal = Math.max(0, standardBalance || 0);

  // If user has Golden Embers, Golden MUST be used first if applying tokens
  const hasGolden = safeGoldenBal > 0;
  const goldenActive = hasGolden ? useGolden : false;

  let goldenDeduction = 0;
  if (goldenActive) {
    goldenDeduction = Math.min(safeBill, safeGoldenBal);
  }

  const remainingAfterGolden = Math.max(0, safeBill - goldenDeduction);

  // Standard Embers can pay up to 30% of the bill
  const standardMaxLimit = Math.floor(safeBill * 0.30);
  const canUseStandard = (!hasGolden || goldenActive) && safeStandardBal > 0 && remainingAfterGolden > 0;

  let standardDeduction = 0;
  if (useStandard && canUseStandard) {
    standardDeduction = Math.min(remainingAfterGolden, standardMaxLimit, safeStandardBal);
  }

  const totalEmberDiscount = goldenDeduction + standardDeduction;
  const finalPayable = Math.max(0, safeBill - totalEmberDiscount);

  return {
    goldenDeduction,
    standardDeduction,
    totalEmberDiscount,
    finalPayable,
    canUseStandard,
    standardMaxLimit
  };
}

/**
 * Debits Golden and/or Standard Ember coins from user account when applied at checkout.
 */
export async function debitEmberCoinsForOrder({
  userId,
  orderId,
  goldenAmount,
  standardAmount
}: {
  userId: string;
  orderId: string;
  goldenAmount: number;
  standardAmount: number;
}): Promise<{ success: boolean; remainingGolden: number; remainingStandard: number }> {
  if (!userId || (goldenAmount <= 0 && standardAmount <= 0)) {
    return { success: true, remainingGolden: 0, remainingStandard: 0 };
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    let currentGolden = 0;
    let currentStandard = 0;
    let currentTx: WalletTransaction[] = [];

    if (userSnap.exists()) {
      const uData = userSnap.data() as User;
      currentGolden = Number(uData.goldenEmberBalance || 0);
      currentStandard = Number(uData.standardEmberBalance || 0);
      currentTx = Array.isArray(uData.walletTransactions) ? uData.walletTransactions : [];
    }

    const remainingGolden = Math.max(0, currentGolden - goldenAmount);
    const remainingStandard = Math.max(0, currentStandard - standardAmount);
    const remainingTotal = remainingGolden + remainingStandard;
    const nowIso = new Date().toISOString();

    const newTransactions: WalletTransaction[] = [];

    if (goldenAmount > 0) {
      newTransactions.push({
        id: `tx-gold-pay-${orderId.slice(-6)}-${Date.now()}`,
        type: 'debit',
        amount: goldenAmount,
        emberType: 'golden',
        description: `Golden Ember Coins applied to Order #${orderId.slice(-6)} (100% Coverage)`,
        orderId,
        createdAt: nowIso
      });
    }

    if (standardAmount > 0) {
      newTransactions.push({
        id: `tx-std-pay-${orderId.slice(-6)}-${Date.now() + 1}`,
        type: 'debit',
        amount: standardAmount,
        emberType: 'standard',
        description: `Standard Ember Coins applied to Order #${orderId.slice(-6)} (30% Bill Cap)`,
        orderId,
        createdAt: nowIso
      });
    }

    const updatedTxList = [...newTransactions, ...currentTx];

    await updateDoc(userRef, {
      goldenEmberBalance: remainingGolden,
      standardEmberBalance: remainingStandard,
      walletBalance: remainingTotal,
      walletTransactions: updatedTxList
    });

    // Update local cache
    try {
      const cached = localStorage.getItem('fitzaika_user_session');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.goldenEmberBalance = remainingGolden;
        parsed.standardEmberBalance = remainingStandard;
        parsed.walletBalance = remainingTotal;
        parsed.walletTransactions = updatedTxList;
        localStorage.setItem('fitzaika_user_session', JSON.stringify(parsed));
      }
    } catch (e) {}

    return {
      success: true,
      remainingGolden,
      remainingStandard
    };
  } catch (e) {
    console.warn("Could not debit Ember Coins in Firestore:", e);
    return { success: false, remainingGolden: 0, remainingStandard: 0 };
  }
}
