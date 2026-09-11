/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Order, WalletTransaction } from '../types';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Checks if an order is eligible for Golden Ember token refund:
 * Rules per business requirement:
 * 1. Ember token refund ONLY applies to cancellations from the user side.
 * 2. ONLY applies if kitchen didn't accept the order yet.
 * 3. ONLY applies if user already paid for it (prepaid).
 * 4. NEVER applies to COD (Cash on Delivery) orders of any type.
 * 5. Kitchen or Admin cancellations do NOT issue Ember tokens.
 */
export function isOrderEligibleForEmberRefund(
  order: Order | null | undefined,
  cancelledBy: 'customer' | 'kitchen' | 'admin' = 'customer'
): { eligible: boolean; reason?: string } {
  if (!order) return { eligible: false, reason: 'Order not found' };

  // Rule 1: Strictly customer-side cancellations only
  if (cancelledBy !== 'customer') {
    return {
      eligible: false,
      reason: 'Ember token refunds only apply to customer-initiated cancellations.'
    };
  }

  // Rule 2: Strictly does NOT apply to COD orders
  const pMethod = (order.paymentMethod || '').toLowerCase();
  const isCod =
    pMethod === 'cod' ||
    pMethod === 'cash' ||
    pMethod === 'cash_on_delivery' ||
    Boolean((order as any).isCOD);

  if (isCod) {
    return {
      eligible: false,
      reason: 'Cash on Delivery (COD) orders do not qualify for wallet refunds as no payment was collected.'
    };
  }

  // Rule 3: Must be prepaid (online, card, upi, or wallet)
  const isPaid =
    order.paymentStatus === 'paid' ||
    pMethod === 'online' ||
    pMethod === 'upi' ||
    pMethod === 'card' ||
    pMethod === 'wallet' ||
    (order.walletUsedAmount && order.walletUsedAmount > 0);

  if (!isPaid) {
    return {
      eligible: false,
      reason: 'Unpaid orders do not qualify for refunds.'
    };
  }

  // Rule 4: Kitchen must NOT have accepted or started cooking yet
  const isKitchenAccepted =
    Boolean(order.acceptedByKitchenId && order.acceptedByKitchenId.trim().length > 0) ||
    order.status === 'cooking' ||
    order.status === 'ready_for_pickup' ||
    order.status === 'out_for_delivery' ||
    order.status === 'delivered' ||
    order.kdsStage === 'cooking' ||
    order.kdsStage === 'plated' ||
    order.kdsStage === 'dispatched' ||
    Boolean(order.cookingStartedAt);

  if (isKitchenAccepted) {
    return {
      eligible: false,
      reason: 'Kitchen has already accepted and prepared this order.'
    };
  }

  return { eligible: true };
}

/**
 * Validates if an order is eligible for customer self-service cancellation:
 * Customers can only self-cancel before the kitchen accepts and begins cooking.
 */
export function canCustomerCancelOrder(order: Order | null | undefined): boolean {
  if (!order) return false;
  if (order.status === 'cancelled' || order.status === 'delivered') return false;
  // Group orders are collaborative and strictly non-cancellable once placed
  if (order.isGroupOrder || order.groupRoomId || order.isNonCancellable) return false;

  // Once accepted by kitchen or cooking commences, customer self-cancellation is locked
  const isKitchenAccepted =
    Boolean(order.acceptedByKitchenId && order.acceptedByKitchenId.trim().length > 0) ||
    order.status === 'cooking' ||
    order.status === 'ready_for_pickup' ||
    order.status === 'out_for_delivery' ||
    order.kdsStage === 'cooking' ||
    order.kdsStage === 'plated' ||
    order.kdsStage === 'dispatched' ||
    Boolean(order.cookingStartedAt);

  return !isKitchenAccepted;
}

/**
 * Cancels an order.
 * Strictly complies with:
 * - NO ember tokens given upon cancellation of any type EXCEPT:
 *   cancellation from user side IF kitchen didn't accept AND user already paid for it.
 * - Does NOT apply to COD orders.
 */
export async function cancelOrderWithInstantWalletRefund(
  order: Order,
  userId: string,
  cancellationReason: string = 'Customer cancelled before kitchen acceptance',
  cancelledBy: 'customer' | 'kitchen' | 'admin' = 'customer'
): Promise<{
  success: boolean;
  refundedAmount: number;
  newGoldenBalance: number;
  isRefundGiven: boolean;
  error?: string;
  refundDenialReason?: string;
}> {
  try {
    if (cancelledBy === 'customer' && !canCustomerCancelOrder(order)) {
      return {
        success: false,
        refundedAmount: 0,
        newGoldenBalance: 0,
        isRefundGiven: false,
        error: 'Order has already been accepted or begun cooking by the kitchen, and cannot be self-cancelled.'
      };
    }

    const refundEligibility = isOrderEligibleForEmberRefund(order, cancelledBy);
    const isRefundGiven = refundEligibility.eligible;
    const refundAmount = isRefundGiven ? (order.total || 0) : 0;
    const nowIso = new Date().toISOString();

    // 1. Mark order cancelled in Firestore
    const orderRef = doc(db, 'orders', order.id);
    const trackingDescription = isRefundGiven
      ? `Cancelled prior to kitchen acceptance. 100% prepaid order value (₹${refundAmount}) refunded to Bhatti Wallet as Golden Ember Coins.`
      : `Order cancelled by ${cancelledBy}. No wallet refund applicable (${refundEligibility.reason || 'Not eligible for refund'}).`;

    await updateDoc(orderRef, {
      status: 'cancelled',
      kdsStage: 'cancelled',
      cancelledAt: nowIso,
      cancelledBy,
      cancellationReason,
      refundedToWallet: isRefundGiven,
      refundStatus: isRefundGiven ? 'refunded_to_wallet' : 'no_refund',
      refundAmount,
      trackingSteps: [
        ...(Array.isArray(order.trackingSteps) ? order.trackingSteps : []),
        {
          title: isRefundGiven ? 'Order Cancelled & Golden Embers Refunded' : 'Order Cancelled',
          description: trackingDescription,
          done: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    });

    // 2. If eligible for refund, credit user Golden Ember balance in Firestore & LocalStorage
    let currentGolden = 0;
    let currentStandard = 0;
    let currentTx: WalletTransaction[] = [];

    const effectiveUserId = userId || order.userId;
    if (effectiveUserId) {
      try {
        const userRef = doc(db, 'users', effectiveUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const uData = userSnap.data() as User;
          currentGolden = Number(uData.goldenEmberBalance || 0);
          currentStandard = Number(uData.standardEmberBalance || 0);
          currentTx = Array.isArray(uData.walletTransactions) ? uData.walletTransactions : [];
        } else {
          try {
            const cached = localStorage.getItem('fitzaika_cached_user_profile') || localStorage.getItem('fitzaika_user_session');
            if (cached) {
              const parsed = JSON.parse(cached);
              currentGolden = Number(parsed.goldenEmberBalance || 0);
              currentStandard = Number(parsed.standardEmberBalance || 0);
              currentTx = Array.isArray(parsed.walletTransactions) ? parsed.walletTransactions : [];
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    if (isRefundGiven && refundAmount > 0 && effectiveUserId) {
      const newGoldenBalance = currentGolden + refundAmount;
      const newTotalBalance = newGoldenBalance + currentStandard;

      const newTransaction: WalletTransaction = {
        id: `tx-gold-ref-${order.id.slice(-6)}-${Date.now()}`,
        type: 'credit',
        amount: refundAmount,
        emberType: 'golden',
        description: `Golden Ember Refund for cancelled Order #${order.id.slice(-6)} (100% Bill Eligible)`,
        orderId: order.id,
        createdAt: nowIso
      };

      const updatedTxList = [newTransaction, ...currentTx];

      try {
        const userRef = doc(db, 'users', effectiveUserId);
        await setDoc(
          userRef,
          {
            goldenEmberBalance: newGoldenBalance,
            walletBalance: newTotalBalance,
            walletTransactions: updatedTxList,
            updatedAt: nowIso
          },
          { merge: true }
        );
      } catch (userErr) {
        console.warn("Could not credit user document in Firestore:", userErr);
      }

      // Update local cached user profile & session
      try {
        ['fitzaika_user_session', 'fitzaika_cached_user_profile'].forEach((key) => {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached);
            parsed.goldenEmberBalance = newGoldenBalance;
            parsed.walletBalance = newTotalBalance;
            parsed.walletTransactions = updatedTxList;
            localStorage.setItem(key, JSON.stringify(parsed));
          }
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('fitzaika_user_updated', {
              detail: {
                goldenEmberBalance: newGoldenBalance,
                walletBalance: newTotalBalance,
                walletTransactions: updatedTxList
              }
            })
          );
        }
      } catch (e) {}

      return {
        success: true,
        refundedAmount: refundAmount,
        newGoldenBalance,
        isRefundGiven: true
      };
    }

    // No refund given (COD, admin/kitchen cancelled, not prepaid, etc.)
    return {
      success: true,
      refundedAmount: 0,
      newGoldenBalance: currentGolden,
      isRefundGiven: false,
      refundDenialReason: refundEligibility.reason
    };
  } catch (err: any) {
    console.error("Failed to cancel order:", err);
    return {
      success: false,
      refundedAmount: 0,
      newGoldenBalance: 0,
      isRefundGiven: false,
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
    } else {
      // Check local cache if user document does not exist in Firestore yet
      try {
        const cached = localStorage.getItem('fitzaika_cached_user_profile') || localStorage.getItem('fitzaika_user_session');
        if (cached) {
          const parsed = JSON.parse(cached);
          currentGolden = Number(parsed.goldenEmberBalance || 0);
          currentStandard = Number(parsed.standardEmberBalance || 0);
          currentTx = Array.isArray(parsed.walletTransactions) ? parsed.walletTransactions : [];
        }
      } catch (e) {}
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

    try {
      await setDoc(
        userRef,
        {
          goldenEmberBalance: remainingGolden,
          standardEmberBalance: remainingStandard,
          walletBalance: remainingTotal,
          walletTransactions: updatedTxList,
          updatedAt: nowIso
        },
        { merge: true }
      );
    } catch (e) {
      console.warn("Could not set user document in Firestore:", e);
    }

    // Update local cache and dispatch event for immediate UI updates
    try {
      ['fitzaika_user_session', 'fitzaika_cached_user_profile'].forEach((key) => {
        const cached = localStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.goldenEmberBalance = remainingGolden;
          parsed.standardEmberBalance = remainingStandard;
          parsed.walletBalance = remainingTotal;
          parsed.walletTransactions = updatedTxList;
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('fitzaika_user_updated', {
            detail: {
              goldenEmberBalance: remainingGolden,
              standardEmberBalance: remainingStandard,
              walletBalance: remainingTotal,
              walletTransactions: updatedTxList
            }
          })
        );
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
