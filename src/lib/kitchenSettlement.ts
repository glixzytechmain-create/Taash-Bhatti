/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KitchenInventoryItem, Meal, Order, CashDepositRequest, KitchenEODReport } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Maps an ingredient item name or category to meal keywords to identify dependent menu items.
 */
export function getMealDependencyMatcher(ingredientName: string): (meal: Meal) => boolean {
  const nameLower = ingredientName.toLowerCase();

  // 1. Proteins
  if (nameLower.includes('chicken')) {
    return (m) => m.name.toLowerCase().includes('chicken') || (m.description || '').toLowerCase().includes('chicken');
  }
  if (nameLower.includes('paneer') || nameLower.includes('cottage cheese')) {
    return (m) => m.name.toLowerCase().includes('paneer') || (m.description || '').toLowerCase().includes('paneer');
  }
  if (nameLower.includes('egg') || nameLower.includes('omelette') || nameLower.includes('bhurji')) {
    return (m) => m.name.toLowerCase().includes('egg') || m.name.toLowerCase().includes('omelette') || m.name.toLowerCase().includes('bhurji');
  }
  if (nameLower.includes('fish') || nameLower.includes('salmon') || nameLower.includes('prawn')) {
    return (m) => m.name.toLowerCase().includes('fish') || m.name.toLowerCase().includes('salmon') || m.name.toLowerCase().includes('prawn');
  }
  if (nameLower.includes('tofu') || nameLower.includes('soya')) {
    return (m) => m.name.toLowerCase().includes('tofu') || m.name.toLowerCase().includes('soya') || m.name.toLowerCase().includes('soy');
  }
  if (nameLower.includes('whey') || nameLower.includes('protein powder')) {
    return (m) => m.name.toLowerCase().includes('shake') || m.name.toLowerCase().includes('smoothie') || m.name.toLowerCase().includes('whey');
  }

  // 2. Grains & Carbs
  if (nameLower.includes('rice') || nameLower.includes('basmati')) {
    return (m) => m.name.toLowerCase().includes('rice') || m.name.toLowerCase().includes('biryani') || m.name.toLowerCase().includes('pulao') || m.name.toLowerCase().includes('bowl');
  }
  if (nameLower.includes('oat') || nameLower.includes('oats') || nameLower.includes('porridge')) {
    return (m) => m.name.toLowerCase().includes('oat') || m.name.toLowerCase().includes('porridge');
  }
  if (nameLower.includes('quinoa')) {
    return (m) => m.name.toLowerCase().includes('quinoa');
  }
  if (nameLower.includes('roti') || nameLower.includes('chapati') || nameLower.includes('wrap') || nameLower.includes('tortilla')) {
    return (m) => m.name.toLowerCase().includes('wrap') || m.name.toLowerCase().includes('roti') || m.name.toLowerCase().includes('roll');
  }

  // 3. Greens & Vegetables
  if (nameLower.includes('broccoli') || nameLower.includes('salad') || nameLower.includes('greens')) {
    return (m) => m.name.toLowerCase().includes('salad') || m.name.toLowerCase().includes('broccoli') || m.name.toLowerCase().includes('greens');
  }

  // 4. Default ingredient matching from meal.ingredients list or name
  return (m) => {
    if (m.ingredients && Array.isArray(m.ingredients)) {
      return m.ingredients.some(ing => ing.name.toLowerCase().includes(nameLower) || nameLower.includes(ing.name.toLowerCase()));
    }
    return m.name.toLowerCase().includes(nameLower) || (m.description || '').toLowerCase().includes(nameLower);
  };
}

/**
 * Automatically evaluates kitchen inventory and updates dependent meals in Firestore.
 * When an ingredient is out_of_stock, marks dependent meals as isAvailable: false.
 * When all required ingredients are in_stock, restores isAvailable: true.
 */
export async function syncLowStockMenuWithFirestore(
  inventoryItems: KitchenInventoryItem[],
  allMeals: Meal[]
): Promise<{
  disabledCount: number;
  restoredCount: number;
  affectedMeals: { mealId: string; mealName: string; outOfStockItem: string }[];
}> {
  const outOfStockItems = inventoryItems.filter(item => item.status === 'out_of_stock' || item.quantity <= 0);

  const isMealDependentOnItem = (meal: Meal, item: KitchenInventoryItem): boolean => {
    // 1. Explicitly configured menu items for this ingredient
    if (Array.isArray(item.connectedMealIds) && item.connectedMealIds.includes(meal.id)) {
      return true;
    }
    // 2. Name-based ingredient recipe matching
    const matcher = getMealDependencyMatcher(item.name);
    return matcher(meal);
  };

  let disabledCount = 0;
  let restoredCount = 0;
  const affectedMeals: { mealId: string; mealName: string; outOfStockItem: string }[] = [];

  for (const meal of allMeals) {
    const triggeringItem = outOfStockItems.find(item => isMealDependentOnItem(meal, item));

    if (triggeringItem) {
      // Dish depends on an out_of_stock ingredient -> mark sold out
      if (meal.isAvailable !== false) {
        try {
          await updateDoc(doc(db, 'meals', meal.id), {
            isAvailable: false,
            soldOutReason: `Ingredient Out of Stock: ${triggeringItem.name}`
          });
          disabledCount++;
          affectedMeals.push({
            mealId: meal.id,
            mealName: meal.name,
            outOfStockItem: triggeringItem.name
          });
        } catch (e) {
          console.warn(`Failed to auto-disable meal ${meal.id}:`, e);
        }
      }
    } else {
      // Dish has all ingredients in stock -> if it was previously auto-disabled, restore it
      if (meal.isAvailable === false && (meal as any).soldOutReason?.includes('Ingredient Out of Stock:')) {
        try {
          await updateDoc(doc(db, 'meals', meal.id), {
            isAvailable: true,
            soldOutReason: null
          });
          restoredCount++;
        } catch (e) {
          console.warn(`Failed to auto-restore meal ${meal.id}:`, e);
        }
      }
    }
  }

  return { disabledCount, restoredCount, affectedMeals };
}

/**
 * Computes an End-of-Day (EOD) Shift Settlement Report.
 */
export function computeEODShiftReport({
  kitchenId,
  kitchenName,
  managerId,
  managerName,
  orders,
  inventoryItems,
  cashDeposits,
  shiftType = 'full_day',
  notes = '',
  peakRushBufferMinutes = 0
}: {
  kitchenId: string;
  kitchenName: string;
  managerId: string;
  managerName: string;
  orders: Order[];
  inventoryItems: KitchenInventoryItem[];
  cashDeposits: CashDepositRequest[];
  shiftType?: 'morning' | 'evening' | 'full_day';
  notes?: string;
  peakRushBufferMinutes?: number;
}): KitchenEODReport {
  const todayStr = new Date().toISOString().split('T')[0];

  // Scoped orders
  const todayOrders = orders.filter(o => {
    if (o.acceptedByKitchenId !== kitchenId && o.kitchenId !== kitchenId) return false;
    const orderDate = o.date || o.createdAt || '';
    return orderDate.includes(todayStr) || !o.date;
  });

  const totalReceived = todayOrders.length;
  const fulfilledOrders = todayOrders.filter(o => o.status === 'delivered' || o.status === 'ready_for_pickup' || o.status === 'out_for_delivery');
  const cancelledOrders = todayOrders.filter(o => o.status === 'cancelled');
  const takeawayCount = todayOrders.filter(o => o.fulfillmentMode === 'takeaway').length;
  const deliveryCount = todayOrders.filter(o => o.fulfillmentMode !== 'takeaway').length;
  const grossRevenue = todayOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  // Prep speed calculation
  let totalPrepMinutes = 0;
  let prepSamples = 0;
  let laneACount = 0;
  let laneBCount = 0;

  todayOrders.forEach(o => {
    if (o.lane === 'lane_a') laneACount++;
    if (o.lane === 'lane_b') laneBCount++;

    if (o.cookingStartedAt && o.platedAt) {
      const start = new Date(o.cookingStartedAt).getTime();
      const end = new Date(o.platedAt).getTime();
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        totalPrepMinutes += Math.round((end - start) / 60000);
        prepSamples++;
      }
    } else {
      // Estimate baseline prep time: 14 mins + extraPrepMinutes
      totalPrepMinutes += Math.max(8, 14 + (o.extraPrepMinutes || 0));
      prepSamples++;
    }
  });

  const avgPrepTimeMinutes = prepSamples > 0 ? Math.round(totalPrepMinutes / prepSamples) : 14;

  // Financial reconciliation
  const codOrders = todayOrders.filter(o => 
    (o.paymentMethod || '').toLowerCase().includes('cash') || 
    (o.paymentMethod || '').toLowerCase().includes('cod')
  );
  const codCollectedByFleet = codOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  // Cash verified at kitchen cashier desk
  const approvedDeposits = cashDeposits.filter(d => d.status === 'approved' && d.kitchenId === kitchenId);
  const cashDepositedAtKitchen = approvedDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);

  const cashReconciliationVariance = cashDepositedAtKitchen - codCollectedByFleet;
  const prepaidRevenue = Math.max(0, grossRevenue - codCollectedByFleet);

  return {
    id: `EOD-${kitchenId}-${todayStr}-${Date.now().toString().slice(-4)}`,
    reportDate: todayStr,
    closedAt: new Date().toISOString(),
    kitchenId,
    kitchenName,
    managerId,
    managerName,
    shiftType,
    totalOrdersReceived: totalReceived,
    totalOrdersFulfilled: fulfilledOrders.length,
    totalOrdersCancelled: cancelledOrders.length,
    takeawayOrdersCount: takeawayCount,
    deliveryOrdersCount: deliveryCount,
    grossRevenue,
    avgPrepTimeMinutes,
    laneAPrepCount: laneACount,
    laneBPrepCount: laneBCount,
    peakRushBufferUsedMinutes: peakRushBufferMinutes,
    codCollectedByFleet,
    cashDepositedAtKitchen,
    cashReconciliationVariance,
    prepaidRevenue,
    notes: notes || 'Standard shift closure. All active cooking stations cleaned and sanitized.',
    status: 'settled'
  };
}
