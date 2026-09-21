/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  SmartCoupon, 
  SmartCouponCriteria, 
  CouponEvaluationContext, 
  CouponEvaluationResult, 
  DayOfWeek 
} from '../types';

const DAY_OF_WEEK_MAP: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const DAY_NAMES: Record<DayOfWeek, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday'
};

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Normalizes any coupon (new SmartCoupon or legacy schema) into a standard SmartCoupon structure
 */
export function normalizeSmartCoupon(raw: any): SmartCoupon {
  if (!raw) {
    throw new Error('Coupon data is required');
  }

  const code = (raw.code || raw.id || '').trim().toUpperCase();
  const criteria: SmartCouponCriteria = {
    // Sequence
    sequenceRule: raw.criteria?.sequenceRule || (raw.firstOrderOnly ? 'first_order_only' : 'any'),
    exactNthOrder: raw.criteria?.exactNthOrder || raw.exactNthOrder,
    minCompletedOrders: raw.criteria?.minCompletedOrders || raw.minCompletedOrders,
    maxRedemptionsPerUser: raw.criteria?.maxRedemptionsPerUser ?? raw.maxRedemptionsPerUser ?? 1,
    userCooldownDays: raw.criteria?.userCooldownDays || raw.userCooldownDays,

    // Schedule
    startDate: raw.criteria?.startDate || raw.startDate,
    endDate: raw.criteria?.endDate || raw.expiryDate || raw.endDate,
    allowedDaysOfWeek: raw.criteria?.allowedDaysOfWeek || raw.allowedDaysOfWeek,
    mealSlotWindow: raw.criteria?.mealSlotWindow || raw.mealSlotWindow,

    // Cart
    minOrderValue: Number(raw.criteria?.minOrderValue ?? raw.minOrderValue ?? 0),
    maxDiscountCap: raw.criteria?.maxDiscountCap ? Number(raw.criteria.maxDiscountCap) : (raw.maxDiscountCap ? Number(raw.maxDiscountCap) : undefined),
    requiredCategories: raw.criteria?.requiredCategories || raw.requiredCategories,
    requiredMealIds: raw.criteria?.requiredMealIds || raw.requiredMealIds,
    dietaryRequirement: raw.criteria?.dietaryRequirement || raw.dietaryRequirement || 'any',
    minCartItems: raw.criteria?.minCartItems || raw.minCartItems,

    // Channels
    allowedChannels: raw.criteria?.allowedChannels || raw.allowedChannels,
    allowedKitchenIds: raw.criteria?.allowedKitchenIds || raw.allowedKitchenIds,

    // Stacking & Audience
    isStackable: raw.criteria?.isStackable ?? raw.isStackable ?? false,
    stackableWith: raw.criteria?.stackableWith || raw.stackableWith,
    targetUserId: raw.criteria?.targetUserId || raw.targetUserId,
    targetUserEmail: raw.criteria?.targetUserEmail || raw.targetUserEmail,
    targetUserPhone: raw.criteria?.targetUserPhone || raw.targetUserPhone,
    isDormantUserOnly: raw.criteria?.isDormantUserOnly ?? raw.isDormantUserOnly ?? false,
    dormantDaysThreshold: raw.criteria?.dormantDaysThreshold || raw.dormantDaysThreshold || 30,
  };

  return {
    id: code,
    code,
    title: raw.title || raw.name || `Special Offer ${code}`,
    description: raw.description || raw.subtitle || '',
    badge: raw.badge,
    discountType: raw.discountType || 'percentage',
    discountValue: Number(raw.discountValue || 0),
    perkName: raw.perkName,
    isActive: raw.isActive !== false,
    criteria,
    globalUsageCap: raw.globalUsageCap ? Number(raw.globalUsageCap) : (raw.usageCap ? Number(raw.usageCap) : undefined),
    globalUsageCount: Number(raw.globalUsageCount ?? raw.usageCount ?? 0),
    totalSavings: Number(raw.totalSavings || 0),
    firstNUsersOnly: raw.firstNUsersOnly ? Number(raw.firstNUsersOnly) : undefined,
    scope: raw.scope || 'all',
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    createdBy: raw.createdBy,
  };
}

/**
 * Pure evaluation engine: validates a coupon against the provided context and calculates the exact discount.
 */
export function evaluateSmartCoupon(
  rawCoupon: any,
  context: CouponEvaluationContext
): CouponEvaluationResult {
  const coupon = normalizeSmartCoupon(rawCoupon);
  const now = context.currentTimestamp || new Date();
  const criteria = coupon.criteria;

  // 1. Check if cart contains only pre-discounted Deals & Combos
  const regularItems = context.cartItems.filter(it => !it.isDeal);
  if (context.subtotal <= 0 && context.cartItems.length > 0 && regularItems.length === 0) {
    return {
      isValid: false,
      code: coupon.code,
      discountAmount: 0,
      rejectionCode: 'DEALS_ONLY_CART',
      rejectionReason: 'Coupons cannot be applied to pre-discounted Deals & Combos.',
      helpfulHint: 'Deals already feature bundle pricing. Add regular menu items to use coupons.'
    };
  }

  // 2. Active Status
  if (!coupon.isActive) {
    return {
      isValid: false,
      code: coupon.code,
      discountAmount: 0,
      rejectionCode: 'INACTIVE',
      rejectionReason: 'This coupon is currently paused or inactive.',
      helpfulHint: 'This special offer is temporarily paused by the kitchen team.'
    };
  }

  // 3. Global Expiry Date Check
  if (criteria.endDate) {
    const end = new Date(criteria.endDate);
    if (!isNaN(end.getTime()) && now > end) {
      const formatted = end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'EXPIRED',
        rejectionReason: `This coupon expired on ${formatted}.`,
        helpfulHint: 'This promotion has concluded. Check Deals for latest offers!'
      };
    }
  }

  // 4. Start Date Check
  if (criteria.startDate) {
    const start = new Date(criteria.startDate);
    if (!isNaN(start.getTime()) && now < start) {
      const formatted = start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'INACTIVE',
        rejectionReason: `This coupon will become active on ${formatted}.`,
        helpfulHint: `Campaign starts on ${formatted}. Stay tuned!`
      };
    }
  }

  // 5. Global Platform Usage Cap
  if (coupon.globalUsageCap && (coupon.globalUsageCount || 0) >= coupon.globalUsageCap) {
    return {
      isValid: false,
      code: coupon.code,
      discountAmount: 0,
      rejectionCode: 'GLOBAL_CAP_REACHED',
      rejectionReason: 'This campaign cap has been fully claimed.',
      helpfulHint: 'All available vouchers for this limited offer have been redeemed.'
    };
  }

  // 6. First N Users Only
  if (coupon.firstNUsersOnly && (coupon.globalUsageCount || 0) >= coupon.firstNUsersOnly) {
    return {
      isValid: false,
      code: coupon.code,
      discountAmount: 0,
      rejectionCode: 'GLOBAL_CAP_REACHED',
      rejectionReason: `First ${coupon.firstNUsersOnly} users limit reached for this campaign.`,
      helpfulHint: 'The early bird limit for this offer has been reached.'
    };
  }

  // 7. Fulfillment Channel (Delivery vs Takeaway vs Dine-In)
  if (criteria.allowedChannels && criteria.allowedChannels.length > 0) {
    if (!criteria.allowedChannels.includes(context.fulfillmentMode)) {
      let hint = 'This coupon is not valid for this order type.';
      if (criteria.allowedChannels.length === 1 && criteria.allowedChannels[0] === 'dine_in') {
        hint = '🍽️ Exclusive Dine-In offer! Scan your table QR or switch to Dine-In to apply.';
      } else if (criteria.allowedChannels.length === 1 && criteria.allowedChannels[0] === 'delivery') {
        hint = '🚚 Valid strictly for Home Delivery orders.';
      } else if (criteria.allowedChannels.length === 1 && criteria.allowedChannels[0] === 'takeaway') {
        hint = '🛍️ Valid strictly for Takeaway Self-Pickup orders.';
      }

      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'CHANNEL_MISMATCH',
        rejectionReason: `Not valid for ${context.fulfillmentMode.replace('_', ' ')}.`,
        helpfulHint: hint
      };
    }
  }

  // 8. Kitchen / Branch Restrictions
  if (criteria.allowedKitchenIds && criteria.allowedKitchenIds.length > 0) {
    if (context.kitchenId && !criteria.allowedKitchenIds.includes(context.kitchenId)) {
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'LOCATION_MISMATCH',
        rejectionReason: 'This coupon is not valid at this kitchen branch.',
        helpfulHint: 'This promotion is exclusive to select Taash Bhatti hubs.'
      };
    }
  }

  // 9. Day of Week Restriction
  if (criteria.allowedDaysOfWeek && criteria.allowedDaysOfWeek.length > 0) {
    const currentDayKey = DAY_OF_WEEK_MAP[now.getDay()];
    if (!criteria.allowedDaysOfWeek.includes(currentDayKey)) {
      const allowedNames = criteria.allowedDaysOfWeek.map(d => DAY_NAMES[d] || d).join(', ');
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'DAY_OF_WEEK_MISMATCH',
        rejectionReason: `Valid only on ${allowedNames}.`,
        helpfulHint: `Today is ${DAY_NAMES[currentDayKey]}. This offer unlocks every ${allowedNames}.`
      };
    }
  }

  // 10. Meal Slot / Time Window
  if (criteria.mealSlotWindow?.startTime && criteria.mealSlotWindow?.endTime) {
    const startParts = criteria.mealSlotWindow.startTime.split(':').map(Number);
    const endParts = criteria.mealSlotWindow.endTime.split(':').map(Number);

    const startMinutes = startParts[0] * 60 + (startParts[1] || 0);
    const endMinutes = endParts[0] * 60 + (endParts[1] || 0);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let isInWindow = false;
    if (startMinutes <= endMinutes) {
      isInWindow = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Handles overnight windows (e.g. 23:00 to 03:00)
      isInWindow = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }

    if (!isInWindow) {
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'TIME_WINDOW_MISMATCH',
        rejectionReason: `Valid only between ${criteria.mealSlotWindow.startTime} and ${criteria.mealSlotWindow.endTime}.`,
        helpfulHint: `This special time-locked offer runs from ${criteria.mealSlotWindow.startTime} to ${criteria.mealSlotWindow.endTime}.`
      };
    }
  }

  // 11. Customer Order Sequence & Lifecycle
  const completedOrders = context.user?.completedOrderCount ?? 0;
  const currentOrderNum = completedOrders + 1;

  if (criteria.sequenceRule === 'first_order_only' && completedOrders > 0) {
    return {
      isValid: false,
      code: coupon.code,
      discountAmount: 0,
      rejectionCode: 'SEQUENCE_NOT_MET',
      rejectionReason: 'Welcome offer is strictly for 1st-time orders.',
      helpfulHint: `Welcome coupon '${coupon.code}' is valid only on your first order. (You have completed ${completedOrders} orders).`
    };
  }

  if (criteria.sequenceRule === 'exact_nth_order' && criteria.exactNthOrder) {
    if (currentOrderNum !== criteria.exactNthOrder) {
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'SEQUENCE_NOT_MET',
        rejectionReason: `Valid strictly on your ${getOrdinal(criteria.exactNthOrder)} order.`,
        helpfulHint: `Your current order is #${currentOrderNum}. This coupon unlocks on order #${criteria.exactNthOrder}.`
      };
    }
  }

  if (criteria.sequenceRule === 'after_min_orders' && criteria.minCompletedOrders) {
    if (completedOrders < criteria.minCompletedOrders) {
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'SEQUENCE_NOT_MET',
        rejectionReason: `Requires at least ${criteria.minCompletedOrders} completed orders.`,
        helpfulHint: `Complete ${criteria.minCompletedOrders - completedOrders} more orders to unlock this loyalty reward!`
      };
    }
  }

  // 12. Maximum Redemptions per User
  if (criteria.maxRedemptionsPerUser) {
    const userUses = context.user?.userCouponUsageCount ?? 0;
    if (userUses >= criteria.maxRedemptionsPerUser) {
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'MAX_REDEMPTIONS_REACHED',
        rejectionReason: `Maximum ${criteria.maxRedemptionsPerUser} use${criteria.maxRedemptionsPerUser > 1 ? 's' : ''} per customer reached.`,
        helpfulHint: `You have already redeemed '${coupon.code}' ${userUses} time${userUses > 1 ? 's' : ''}.`
      };
    }
  }

  // 13. User Cooldown Days
  if (criteria.userCooldownDays && context.user?.lastRedemptionDate) {
    const lastRedeemed = new Date(context.user.lastRedemptionDate);
    if (!isNaN(lastRedeemed.getTime())) {
      const diffDays = Math.floor((now.getTime() - lastRedeemed.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < criteria.userCooldownDays) {
        const remaining = criteria.userCooldownDays - diffDays;
        return {
          isValid: false,
          code: coupon.code,
          discountAmount: 0,
          rejectionCode: 'COOLDOWN_ACTIVE',
          rejectionReason: `Cooldown active: usable once every ${criteria.userCooldownDays} days.`,
          helpfulHint: `Available again in ${remaining} day${remaining > 1 ? 's' : ''}.`
        };
      }
    }
  }

  // 14. Dormant User Win-Back
  if (criteria.isDormantUserOnly) {
    const thresholdDays = criteria.dormantDaysThreshold || 30;
    if (!context.user?.lastOrderDate) {
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'DORMANT_CRITERIA_NOT_MET',
        rejectionReason: 'Exclusive offer for returning diners.',
        helpfulHint: 'This win-back coupon is reserved for accounts returning after an absence.'
      };
    }
    const lastOrder = new Date(context.user.lastOrderDate);
    const daysSince = Math.floor((now.getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince < thresholdDays) {
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'DORMANT_CRITERIA_NOT_MET',
        rejectionReason: `Valid for accounts inactive for >${thresholdDays} days.`,
        helpfulHint: 'Thank you for being an active diner! Check our regular deals section.'
      };
    }
  }

  // 15. Specific Account Locking (User ID, Email, Phone)
  const isAccountLocked = criteria.targetUserId || criteria.targetUserEmail || criteria.targetUserPhone || coupon.scope === 'account_based';
  if (isAccountLocked) {
    const currentUserId = context.user?.id || '';
    const currentUserEmail = (context.user?.email || '').trim().toLowerCase();
    const currentUserPhone = (context.user?.phone || '').trim();

    const matchesId = Boolean(criteria.targetUserId && currentUserId && criteria.targetUserId === currentUserId);
    const matchesEmail = Boolean(criteria.targetUserEmail && currentUserEmail && criteria.targetUserEmail.toLowerCase() === currentUserEmail);
    const matchesPhone = Boolean(criteria.targetUserPhone && currentUserPhone && criteria.targetUserPhone.endsWith(currentUserPhone.slice(-10)));

    if (!matchesId && !matchesEmail && !matchesPhone) {
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'ACCOUNT_LOCKED',
        rejectionReason: '🔒 Locked to a specific account.',
        helpfulHint: 'This arcade or personal coupon is linked to another diner account.'
      };
    }
  }

  // 16. Minimum Order Value (MOV) on regular items
  if (context.subtotal < criteria.minOrderValue) {
    const missing = criteria.minOrderValue - context.subtotal;
    return {
      isValid: false,
      code: coupon.code,
      discountAmount: 0,
      missingAmount: missing,
      rejectionCode: 'MIN_ORDER_VALUE_NOT_MET',
      rejectionReason: `Minimum subtotal of ₹${criteria.minOrderValue} required.`,
      helpfulHint: `Add ₹${missing} more of delicious Woodfire dishes to unlock ${coupon.code}!`
    };
  }

  // 17. Category Requirement (Must have >= 1 item from specified categories)
  if (criteria.requiredCategories && criteria.requiredCategories.length > 0) {
    const hasRequiredCategory = context.cartItems.some(it => {
      if (it.isDeal) return false;
      const cat = (it.category || '').toLowerCase();
      const name = (it.mealName || '').toLowerCase();
      return criteria.requiredCategories!.some(req => {
        const r = req.toLowerCase();
        return cat.includes(r) || name.includes(r);
      });
    });

    if (!hasRequiredCategory) {
      const catNames = criteria.requiredCategories.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(' / ');
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        requiredCategoryName: catNames,
        rejectionCode: 'CATEGORY_MISSING',
        rejectionReason: `Must include at least one ${catNames} dish.`,
        helpfulHint: `Add a ${catNames} specialty from our menu to activate this code!`
      };
    }
  }

  // 18. Specific Meal ID Requirement
  if (criteria.requiredMealIds && criteria.requiredMealIds.length > 0) {
    const hasRequiredMeal = context.cartItems.some(it => criteria.requiredMealIds!.includes(it.mealId));
    if (!hasRequiredMeal) {
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'CATEGORY_MISSING',
        rejectionReason: 'Must include the designated promotional dish.',
        helpfulHint: 'Add the eligible signature dish to your cart to activate this coupon.'
      };
    }
  }

  // 19. Dietary Requirement (Veg-only vs Non-Veg)
  if (criteria.dietaryRequirement === 'veg_only') {
    const hasNonVeg = context.cartItems.some(it => !it.isDeal && it.isVeg === false);
    if (hasNonVeg) {
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'DIETARY_MISMATCH',
        rejectionReason: 'Valid exclusively for pure vegetarian orders.',
        helpfulHint: 'Remove non-veg dishes to apply this Shakahari special offer.'
      };
    }
  } else if (criteria.dietaryRequirement === 'non_veg_only') {
    const hasNonVeg = context.cartItems.some(it => !it.isDeal && it.isVeg === false);
    if (!hasNonVeg) {
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'DIETARY_MISMATCH',
        rejectionReason: 'Must include at least one non-vegetarian dish.',
        helpfulHint: 'Add a signature woodfire chicken/mutton dish to apply.'
      };
    }
  }

  // 20. Minimum Cart Items Count
  if (criteria.minCartItems) {
    const totalItemsCount = context.cartItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
    if (totalItemsCount < criteria.minCartItems) {
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'MIN_ITEMS_NOT_MET',
        rejectionReason: `Requires at least ${criteria.minCartItems} items in cart.`,
        helpfulHint: `Add ${criteria.minCartItems - totalItemsCount} more item${(criteria.minCartItems - totalItemsCount) > 1 ? 's' : ''} to unlock this feast coupon.`
      };
    }
  }

  // 21. Stacking Validations
  if (context.appliedCoupons && context.appliedCoupons.length > 0) {
    // A. Is this new coupon non-stackable?
    if (criteria.isStackable === false) {
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'STACKING_FORBIDDEN',
        rejectionReason: `Coupon '${coupon.code}' cannot be stacked with other coupons.`,
        helpfulHint: 'Clear your applied coupon first to use this standalone offer.'
      };
    }

    // B. Do existing applied coupons forbid stacking?
    const hasNonStackable = context.appliedCoupons.some(c => c.isStackable === false);
    if (hasNonStackable) {
      return {
        isValid: false,
        code: coupon.code,
        discountAmount: 0,
        rejectionCode: 'STACKING_FORBIDDEN',
        rejectionReason: 'Your current coupon does not allow stacking with other codes.',
        helpfulHint: 'Remove existing coupon to apply this one.'
      };
    }

    // C. Narrow whitelist checks
    if (criteria.stackableWith && criteria.stackableWith.length > 0) {
      const disallowed = context.appliedCoupons.some(c => !criteria.stackableWith!.includes(c.code));
      if (disallowed) {
        return {
          isValid: false,
          code: coupon.code,
          discountAmount: 0,
          rejectionCode: 'STACKING_FORBIDDEN',
          rejectionReason: `Can only stack with: ${criteria.stackableWith.join(', ')}.`,
          helpfulHint: `Stacking restriction: '${coupon.code}' can only be paired with specific companion codes.`
        };
      }
    }
  }

  // 22. Calculate Final Exact Discount Amount
  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    const rawCalc = Math.round((context.subtotal * (coupon.discountValue || 0)) / 100);
    discountAmount = criteria.maxDiscountCap ? Math.min(rawCalc, criteria.maxDiscountCap) : rawCalc;
  } else if (coupon.discountType === 'fixed') {
    discountAmount = Math.min(coupon.discountValue || 0, context.subtotal);
  } else if (coupon.discountType === 'free_delivery') {
    discountAmount = context.fulfillmentMode === 'delivery' ? 35 : 0;
  } else if (coupon.discountType === 'free_perk') {
    discountAmount = 0; // Value is granted in physical dish perk
  }

  return {
    isValid: true,
    code: coupon.code,
    discountAmount,
    helpfulHint: coupon.title ? `🎉 ${coupon.title}` : undefined
  };
}

/**
 * Filter an array of coupons to find all that are valid or almost valid for a given cart context
 */
export function getEligibleCoupons(
  coupons: any[],
  context: CouponEvaluationContext
): {
  eligible: { coupon: SmartCoupon; result: CouponEvaluationResult }[];
  almostEligible: { coupon: SmartCoupon; result: CouponEvaluationResult }[];
} {
  const eligible: { coupon: SmartCoupon; result: CouponEvaluationResult }[] = [];
  const almostEligible: { coupon: SmartCoupon; result: CouponEvaluationResult }[] = [];

  for (const raw of coupons) {
    try {
      const coupon = normalizeSmartCoupon(raw);
      if (!coupon.isActive) continue;

      const result = evaluateSmartCoupon(coupon, context);
      if (result.isValid) {
        eligible.push({ coupon, result });
      } else if (result.missingAmount && result.missingAmount > 0 && result.missingAmount <= 300) {
        // Almost eligible (e.g. within ₹300 of minimum subtotal)
        almostEligible.push({ coupon, result });
      }
    } catch {
      // Ignore malformed coupons
    }
  }

  // Sort eligible by highest discount value first
  eligible.sort((a, b) => b.result.discountAmount - a.result.discountAmount);
  // Sort almostEligible by smallest gap first
  almostEligible.sort((a, b) => (a.result.missingAmount || 999) - (b.result.missingAmount || 999));

  return { eligible, almostEligible };
}
