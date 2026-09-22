/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MealReview {
  id: string;
  mealId: string;
  mealName?: string;
  orderId?: string;
  userId?: string;
  userName: string;
  userEmail?: string;
  rating: number; // 1 to 5
  reviewText?: string;
  tags?: string[];
  createdAt: string;
  verifiedOrder?: boolean;
}

export interface Meal {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  isVeg: boolean;
  isVegan?: boolean;
  timings: ('breakfast' | 'lunch' | 'dinner' | 'snack')[];
  goals?: ('gourmet_special' | 'fresh_salads' | 'chef_signature' | 'quick_bites' | 'fat_loss' | 'muscle_gain' | 'maintenance' | 'post_workout')[];
  spicyLevel: 'mild' | 'medium' | 'spicy';
  rating?: number;
  reviewsCount?: number;
  popularity?: number; // For sorting
  partnerGymExclusive?: boolean;
  isAvailable?: boolean;
  soldOutReason?: string | null;
  isHidden?: boolean;
  isFeatured?: boolean;
  ingredients?: { name: string; grams: number }[];
  prepTimeMinutes?: number;
  goesWellWith?: string[]; // IDs of menu items / meals that pair well with this dish
}

export interface User {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  isPhoneVerified?: boolean;
  atp?: string; // 6-digit All-Time Password for instant zero-SMS-cost login bypass
  atpUpdatedAt?: string;
  role?: 'customer' | 'rider' | 'kitchen' | 'admin';
  city?: string;
  address?: string;
  addressLat?: number;
  addressLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  avatar?: string;
  goal?: string;
  preferredGymId?: string | null;
  savedAddresses: string[];
  savedPayments: { id: string; type: string; details: string }[];
  preferredDietaryType?: 'all' | 'veg' | 'eggetarian';
  favoriteCuisine?: string;
  deckMealIds?: string[];
  favoriteMealIds?: string[];
  onboardingCompleted?: boolean;
  pushNotificationsEnabled?: boolean;
  notificationPromptChoice?: 'enabled' | 'later' | 'never';
  lastNotificationPromptAt?: string;
  banned?: boolean;
  bannedReason?: string;
  bannedAt?: string;
  bannedBy?: string;
  createdAt?: string;
  walletBalance?: number;
  goldenEmberBalance?: number;
  standardEmberBalance?: number;
  walletTransactions?: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  emberType?: 'golden' | 'standard';
  description: string;
  orderId?: string;
  createdAt: string;
}

export interface OfflineDeliveryRecord {
  id: string;
  orderId: string;
  partnerId: string;
  partnerName?: string;
  otp: string;
  deliveryNote?: string;
  deliveredAt: string;
  cashCollected?: number;
  paymentMethod?: string;
  synced: boolean;
  queuedAt: string;
}

export interface ChatMessage {
  id: string;
  orderId: string;
  sender: 'customer' | 'rider';
  text: string;
  timestamp: string;
}

export interface OrderDeliveryRating {
  rating: number;
  tags?: string[];
  feedback?: string;
  ratedAt?: string;
}

export interface OrderItemCustomization {
  portionSize?: 'regular' | 'large' | 'jumbo';
  spiceLevel?: 'mild' | 'medium' | 'spicy' | 'extra_spicy';
  addOns?: { id: string; name: string; price: number }[];
  cookingInstruction?: string;
}

export interface DealStepSelection {
  stepId: string;
  stepTitle: string;
  items: {
    mealId: string;
    mealName: string;
    price: number;
    quantity?: number;
    isVeg?: boolean;
    image?: string;
  }[];
}

export interface OrderItem {
  meal: Meal;
  quantity: number;
  customization?: OrderItemCustomization;
  // Deals & Offers Zone Integration
  isDeal?: boolean;
  dealId?: string;
  dealTitle?: string;
  dealType?: DealOfferType;
  dealSelectedSteps?: DealStepSelection[];
  dealComboItemsSummary?: string;
  packagePrice?: number;
}

export type DealOfferType = 
  | 'build_your_deck'    // Custom Multi-Step Meal Box / Deck builder (Admin defines N steps, questions, dish options)
  | 'fixed_combo'        // Pre-bundled fixed combo package of specific dishes
  | 'bogo'               // Buy 1 Get 1 or Buy X Get Y
  | 'tiered_bundle'      // Pick any N dishes for flat special price
  | 'flash_deal';        // Time-limited discounted special dish or combo

export interface DealStep {
  id: string;
  stepNumber: number;
  title: string;                 // e.g. "Step 1: Choose Your Royal Bhatti Main"
  description?: string;          // e.g. "Select 1 protein-rich signature dish"
  minSelection: number;          // e.g. 1
  maxSelection: number;          // e.g. 1 (or 2 for breads/sides)
  eligibleMealIds: string[];     // Array of meal IDs selectable in this step
  extraPriceOverrides?: { [mealId: string]: number }; // Optional surcharge per dish in this step
}

export interface DealComboItem {
  mealId: string;
  mealName?: string;
  quantity: number;
}

export interface DealOffer {
  id: string;
  title: string;                 // e.g. "Royal 4-Course Bhatti Feast Box"
  tagline: string;               // e.g. "Build your custom meal box with main, bread, beverage & dessert"
  description: string;
  badge?: string;                // e.g. "CHEF SPECIAL", "SAVE 35%", "BOGO FREE", "BESTSELLER"
  image: string;
  ctaButtonText?: string;        // Custom button CTA label (e.g. "Customize 3-Course Box ➜")
  offerType: DealOfferType;

  // Pricing Architecture
  pricingMode: 'flat_package' | 'calculated_with_discount' | 'base_plus_addons';
  packagePrice: number;          // Final offer price (e.g. ₹399) or base starting price
  originalPrice?: number;        // Strike-through standalone retail value (e.g. ₹650)
  discountPct?: number;          // e.g. 38%

  // Type: 'build_your_deck' - Dynamic multi-step configuration
  steps?: DealStep[];

  // Type: 'fixed_combo' - Static list of dishes
  comboItems?: DealComboItem[];

  // Type: 'bogo' - Buy X Get Y configuration
  bogoPrimaryMealIds?: string[];  // Buy any one of these
  bogoRewardMealIds?: string[];   // Get any one of these free or discounted
  bogoDiscountPct?: number;       // 100 for 100% Free, 50 for 50% Off second item

  // Type: 'tiered_bundle' - Pick any N items from a pool
  bundleItemCount?: number;       // e.g. 3
  bundleEligibleMealIds?: string[];

  // Type: 'flash_deal' - Countdown clock
  flashExpiresAt?: string;

  // Metadata & Controls
  isActive: boolean;
  priorityOrder?: number;
  validTimings?: ('breakfast' | 'lunch' | 'dinner' | 'snack')[];
  dietaryType?: 'all' | 'veg' | 'non_veg';
  terms?: string[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

// ==========================================
// SMART CRITERIA-BASED COUPON SYSTEM
// ==========================================

export type CouponDiscountType = 'percentage' | 'fixed' | 'free_delivery' | 'free_perk';
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface SmartCouponCriteria {
  // 1. Order Sequence & Customer History
  sequenceRule?: 'any' | 'first_order_only' | 'exact_nth_order' | 'after_min_orders';
  exactNthOrder?: number;              // e.g. 1 for 1st order, 3 for 3rd order
  minCompletedOrders?: number;         // e.g. 5 (must have completed at least 5 orders)
  maxRedemptionsPerUser?: number;      // e.g. 1 or 2 uses per diner
  userCooldownDays?: number;           // Cooldown in days between redemptions by the same user

  // 2. Schedule, Date & Time Windows
  startDate?: string;                  // ISO Date (YYYY-MM-DD)
  endDate?: string;                    // ISO Date (YYYY-MM-DD)
  allowedDaysOfWeek?: DayOfWeek[];     // ['fri', 'sat', 'sun']
  mealSlotWindow?: {
    startTime: string;                 // '12:00' (24-hour HH:mm)
    endTime: string;                   // '15:30'
  };

  // 3. Cart Composition & Dish Rules
  minOrderValue: number;               // Minimum regular subtotal (₹)
  maxDiscountCap?: number;             // Maximum discount cap in ₹ for % coupons
  requiredCategories?: string[];       // e.g. ['handi', 'tandoor']
  requiredMealIds?: string[];          // e.g. ['biryani-mutton-handi']
  dietaryRequirement?: 'any' | 'veg_only' | 'non_veg_only';
  minCartItems?: number;               // Minimum dish count

  // 4. Fulfillment Channel & Location Rules
  allowedChannels?: ('delivery' | 'takeaway' | 'dine_in')[];
  allowedKitchenIds?: string[];        // Valid only at specific branch/kitchen

  // 5. Stacking & User Targeting
  isStackable?: boolean;
  stackableWith?: string[];            // Codes allowed to stack
  targetUserId?: string;
  targetUserEmail?: string;
  targetUserPhone?: string;
  isDormantUserOnly?: boolean;         // Users inactive > 30 days
  dormantDaysThreshold?: number;       // default 30
  firstXRedeems?: number;              // Optional early-bird limit (e.g. valid for first 50 claims)
}

export interface SmartCouponRedemptionRecord {
  orderId: string;
  userId?: string;
  userName?: string;
  userPhone?: string;
  fulfillmentMode: 'delivery' | 'takeaway' | 'dine_in';
  subtotal: number;
  discountAmount: number;
  timestamp: string;
}

export interface SmartCoupon {
  id: string;                          // clean uppercase code (e.g. 'TAASH50')
  code: string;
  title: string;                       // e.g. 'Royal Weekend Handi Feast'
  description: string;                 // e.g. 'Flat ₹150 OFF on orders above ₹599'
  badge?: string;                      // 'FIRST ORDER', 'WEEKEND EXCLUSIVE', 'DINE-IN ONLY'
  discountType: CouponDiscountType;
  discountValue: number;               // % or ₹ amount
  perkName?: string;                   // For free_perk (e.g. 'Complimentary Firni Handi')
  isActive: boolean;
  isPublic?: boolean;                  // Default true: visible in public list & search. false: hidden/secret code only
  termsText?: string;                  // Raw terms & conditions text
  termsAndConditions?: string[];       // Bullet-point terms & conditions
  firstXRedeems?: number;              // Optional early-bird limit (e.g. valid for first 50 claims)
  criteria: SmartCouponCriteria;

  // Global Platform Metrics & Data Collection
  globalUsageCap?: number;             // Total redemptions allowed across platform
  globalUsageCount?: number;
  totalSavings?: number;               // Historical aggregate ₹ discounts given
  firstNUsersOnly?: number;            // Cap on distinct first N users
  scope?: 'all' | 'account_based' | 'gym_only';
  channelBreakdown?: {
    delivery: number;
    takeaway: number;
    dine_in: number;
  };
  recentRedemptions?: SmartCouponRedemptionRecord[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface CouponEvaluationContext {
  subtotal: number;                    // Regular menu subtotal (excluding deals)
  cartItems: {
    mealId: string;
    mealName?: string;
    category?: string;
    price: number;
    quantity: number;
    isVeg?: boolean;
    isDeal?: boolean;
  }[];
  fulfillmentMode: 'delivery' | 'takeaway' | 'dine_in';
  kitchenId?: string;
  user?: {
    id?: string;
    email?: string;
    phone?: string;
    completedOrderCount?: number;
    lastOrderDate?: string;
    userCouponUsageCount?: number;     // How many times this user redeemed this specific code
    lastRedemptionDate?: string;       // When user last redeemed this specific code
  } | null;
  appliedCoupons?: { code: string; isStackable?: boolean; stackableWith?: string[] }[];
  currentTimestamp?: Date;             // Defaults to new Date()
}

export interface CouponEvaluationResult {
  isValid: boolean;
  code: string;
  discountAmount: number;
  rejectionReason?: string;
  rejectionCode?: 
    | 'CODE_NOT_FOUND'
    | 'INACTIVE'
    | 'EXPIRED'
    | 'GLOBAL_CAP_REACHED'
    | 'CHANNEL_MISMATCH'
    | 'LOCATION_MISMATCH'
    | 'TIME_WINDOW_MISMATCH'
    | 'DAY_OF_WEEK_MISMATCH'
    | 'SEQUENCE_NOT_MET'
    | 'MAX_REDEMPTIONS_REACHED'
    | 'COOLDOWN_ACTIVE'
    | 'MIN_ORDER_VALUE_NOT_MET'
    | 'CATEGORY_MISSING'
    | 'DIETARY_MISMATCH'
    | 'MIN_ITEMS_NOT_MET'
    | 'STACKING_FORBIDDEN'
    | 'ACCOUNT_LOCKED'
    | 'DORMANT_CRITERIA_NOT_MET'
    | 'DEALS_ONLY_CART';
  helpfulHint?: string;                // Actionable guidance for the customer
  missingAmount?: number;              // e.g. "Add ₹45 more to unlock"
  requiredCategoryName?: string;       // e.g. "Woodfire Handi"
}

export interface Order {
  id: string;
  items: OrderItem[];
  date: string;
  status: 'sent' | 'kitchen_accepted' | 'cooking' | 'prepared' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'cancelled';
  fulfillmentMode?: 'delivery' | 'takeaway' | 'dine_in'; // Delivery vs Self-Pickup vs Table Dine-In
  tableNumber?: string; // e.g. "Table 1", "T-04", "VIP Handi Lounge"
  tableId?: string;
  tableRound?: number; // e.g. 1 (Initial round), 2 (Add-on round / extra breads), 3 (Desserts/Drinks)
  isTableAddon?: boolean;
  isDineInGuest?: boolean; // Dine-in guest order without login requirement
  guestName?: string;
  guestPhone?: string;
  dineInBhattiId?: string;
  dineInBhattiName?: string;
  assignedKitchenId?: string;
  scheduledSlot?: string; // 'ASAP (20-30 mins)' or 'Today, 2:00 PM - 2:30 PM'
  takeawayPickupOtp?: string; // 4-digit OTP generated for Cloud Kitchen counter pickup
  total: number;
  discount: number;
  subtotal: number;
  deliveryFee: number;
  address: string;
  paymentMethod: string;
  trackingSteps: {
    title: string;
    description: string;
    done: boolean;
    time?: string;
  }[];
  gymId?: string;
  userId?: string;
  kitchenId?: string;
  kitchenName?: string;
  preferredKitchenId?: string;
  eligibleKitchenIds?: string[];
  acceptedByKitchenId?: string;
  acceptedKitchenName?: string;
  acceptedKitchenAddress?: string;
  acceptedKitchenLat?: number;
  acceptedKitchenLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  rejectedByKitchenIds?: string[];
  riderArrivedAtCustomer?: boolean;
  riderEnRoute?: boolean;
  kdsStage?: 'received' | 'cooking' | 'plated' | 'dispatched' | 'delivered' | 'cancelled';
  lane?: 'lane_a' | 'lane_b' | 'lane_c';
  chefNote?: string;
  chefNotes?: string[]; // Quick tags like Less Spicy, Extra Green Chutney, Well Done
  extraPrepMinutes?: number; // Individual order prep time adjustment in minutes
  isRaining?: boolean; // Rain Mode active at fulfilling kitchen
  createdAt?: string;
  cookingStartedAt?: string;
  platedAt?: string;
  // Delivery Fleet & Logistics
  deliveryPartnerId?: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  deliveryPartnerVehicle?: string;
  deliveryVehicleNumber?: string;
  deliveryNotes?: string;
  deliveryInstructions?: string[]; // Quick rider chips like Leave at door, Don't ring bell
  riderTip?: number; // 1-tap tip amount passed to delivery rider
  gecAddedAmount?: number; // Shortfall amount converted to Gold Ember Coins to unlock free delivery
  gecCoinsEarned?: number; // Gold Ember Coins earned from banking shortfall
  deliveredAt?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryOtp?: string;
  orderOtp?: string;
  riderLat?: number;
  riderLng?: number;
  riderLastUpdated?: string;
  kdsPickupStage?: 'at_kitchen' | 'meal_collected' | 'picked_up' | 'en_route_customer' | 'delivered';
  chatMessages?: ChatMessage[];
  deliveryRating?: OrderDeliveryRating;
  // Payment Collection & Status
  paymentStatus?: 'pending' | 'paid' | 'unpaid' | 'collected';
  collectedPaymentMethod?: 'cash' | 'upi';
  cashCollectedAmount?: number;
  paymentCollectedAt?: string;
  paymentCollectedBy?: string;
  paymentCollectedByName?: string;
  // Cancellation & Wallet Refund
  cancelledAt?: string;
  cancelledBy?: 'customer' | 'kitchen' | 'admin';
  cancellationReason?: string;
  refundedToWallet?: boolean;
  refundAmount?: number;
  walletUsedAmount?: number;
  goldenEmbersUsed?: number;
  standardEmbersUsed?: number;
  standardEmberCoinsEarned?: number;
  standardEmberAwarded?: boolean;
  // Automated Proximity Dispatch
  dispatchProximityKm?: number;
  autoDispatched?: boolean;
  dispatchBroadcastAt?: string;
  dispatchStatus?: 'pending_dispatch' | 'dispatched_to_nearest' | 'accepted_by_rider';
  // Buddy Deck Gifts / Cross-Account Ordering
  isBuddyOrder?: boolean;
  senderId?: string;
  senderName?: string;
  senderPhone?: string;
  receiverId?: string;
  receiverName?: string;
  receiverPhone?: string;
  buddyApprovalCode?: string;
  // Group Ordering Room
  isGroupOrder?: boolean;
  groupRoomId?: string;
  groupRoomCode?: string;
  groupTreatMode?: 'group_treat' | 'your_treat';
  participantUserIds?: string[]; // All participant userIds for shared order history (revenue calculated once per orderId)
  groupMembersSummary?: { memberName: string; itemsCount: number; paidAmount: number; hasPaid: boolean }[];
  isNonCancellable?: boolean;
}

export interface GroupOrderMember {
  id: string; // userId or guestId
  name: string;
  avatar?: string;
  isHost: boolean;
  hasPaid: boolean;
  paymentMode?: 'online' | 'cod';
  paidAt?: string;
  joinedAt: string;
  subtotal: number;
  itemsCount: number;
}

export interface GroupCartItem {
  id: string;
  mealId: string;
  meal: Meal;
  quantity: number;
  addedByUserId: string;
  addedByName: string;
  addedAt: string;
  customization?: string;
}

export interface GroupChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  isHost?: boolean;
  text: string;
  type: 'chat' | 'system' | 'food_added' | 'payment_made';
  timestamp: string;
  reactions?: { [emoji: string]: string[] }; // emoji -> userIds
}

export interface GroupOrderRoom {
  id: string;
  code: string; // 6-character room code (e.g. "TB-7291")
  pin: string;  // 4-digit numeric PIN
  name: string; // e.g. "Dawat with Friends"
  hostUserId: string;
  hostName: string;
  hostAvatar?: string;
  treatMode: 'group_treat' | 'your_treat'; // 'group_treat' (split/everyone pays for own) or 'your_treat' (host treats & pays)
  status: 'active' | 'payment_started' | 'locked' | 'ordered' | 'disbanded';
  kitchenId?: string;
  kitchenName?: string;
  deliveryAddress: {
    street: string;
    city: string;
    pincode: string;
    landmark?: string;
    lat?: number;
    lng?: number;
  };
  members: { [userId: string]: GroupOrderMember };
  items: GroupCartItem[];
  chatMessages: GroupChatMessage[];
  firstPaymentTime?: string; // ISO string when first payment occurred
  paymentExpiryTime?: string; // ISO string = firstPaymentTime + 10 mins
  paymentModeLock?: 'online' | 'cod' | null; // Determined by 1st payment
  firstPayerId?: string;
  firstPayerName?: string;
  createdAt: string;
  finalOrderId?: string;
  orderOtp?: string; // 4-digit Delivery Verification OTP generated upon placing order
  savedAddressLabel?: string; // e.g. "Home", "Office", "Gym"
  deliveryFee: number; // 0 if >= 200, else 40 (on creator)
  isNonCancellable: boolean;
  cartLocked?: boolean;
}

export interface BuddyDeckRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderPhone?: string;
  receiverId: string;
  receiverName?: string;
  status: 'pending' | 'accepted' | 'used' | 'declined' | 'expired';
  approvalCode?: string;
  createdAt: string;
  expiresAt?: string;
  selectedAddress?: string;
  selectedBhattiId?: string;
  selectedBhattiName?: string;
  itemsCount?: number;
}

export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  vehicleType: 'bike' | 'scooter' | 'ev_two_wheeler' | 'bicycle' | 'car';
  vehicleNumber: string;
  kitchenId: string;
  kitchenName?: string;
  city?: string;
  status: 'active' | 'on_delivery' | 'offline' | 'inactive';
  rating?: number;
  deliveriesCompleted?: number;
  cashCollectedToday?: number;
  cashInHand?: number;
  tipsEarnedToday?: number;
  totalTipsEarned?: number;
  currentOrderId?: string | null;
  registeredAt?: string;
  firebaseAuthSynced?: boolean;
  firebaseUid?: string;
  currentLat?: number;
  currentLng?: number;
  banned?: boolean;
}

export interface CashDepositRequest {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerPhone?: string;
  partnerVehicle?: string;
  kitchenId: string;
  kitchenName: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  notes?: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  approvedByName?: string | null;
  rejectedAt?: string | null;
  rejectedReason?: string | null;
}

export interface GymChain {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  registeredAt?: string;
}

export interface Gym {
  id: string;
  chainId: string;
  name: string;
  address: string;
  discountPct: number;
  bannerText: string;
  membersOnlyOffers: string[];
  image: string;
  city: string;
  lat?: number;
  lng?: number;
  ownerContactName?: string;
  ownerContactPhone?: string;
  ownerContactEmail?: string;
  isActive?: boolean;
  isVerified?: boolean;
  partnerStatus?: string;
  offerType?: string;
  freeMealRule?: string;
  referralOffers?: string[];
  membershipBenefits?: string[];
  groupOrderDeals?: string[];
  referralCode?: string;
  redemptionsCount?: number;
  totalConversions?: number;
  registeredAt?: string;
}

export interface Offer {
  id: string;
  code: string;
  title: string;
  description: string;
  discountPct: number;
  minOrder: number;
  type: 'general' | 'bundle' | 'subscription' | 'branch' | 'gym';
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: 'delivery' | 'quality' | 'payments' | 'general' | 'nutrition' | 'gyms';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  mealsCount: number;
  price: number;
  features: string[];
  popular?: boolean;
}

export interface BhattiTable {
  id: string; // e.g. "tbl_1", "tbl_bhatti1_4"
  tableNumber: string; // e.g. "Table 1", "T-04", "VIP Handi Lounge 1"
  capacity: number; // e.g. 2, 4, 6, 8 seats
  isOccupied: boolean; // toggle: true = occupied, false = available
  section?: string; // e.g. "Main Dining Hall", "Outdoor Courtyard", "Rooftop Terrace"
  notes?: string;
  occupiedAt?: string;
  currentOrderId?: string;
  qrCodeDataUrl?: string;
}

export interface Kitchen {
  id: string;
  name: string;
  address: string;
  area?: string;
  city?: string;
  lat: number;
  lng: number;
  geofenceRadius: number; // in km
  registeredAt?: string;
  isActive?: boolean;
  isTakingOrders?: boolean;
  disabledDishIds?: string[]; // Dishes currently sold out at this specific Bhatti
  soldOutDishIds?: string[]; // Dishes currently sold out at this specific Bhatti
  globalPrepDelayMinutes?: number; // Bhatti-wide prep time adjustment/delay in minutes
  isRaining?: boolean; // Bhatti Manager toggle: Currently Raining Mode
  rainDelayMinutes?: number; // Extra delay minutes when raining
  phone?: string;
  managerName?: string;
  rating?: number;
  specialties?: string[];
  image?: string;
  description?: string;
  tables?: BhattiTable[]; // Configured dine-in tables
  hasDineIn?: boolean; // Toggle: Dine-in accepted at this Bhatti
  serviceBellsConfig?: ServiceBellItemConfig[]; // Configured table service bells & pricing
}

export interface ServiceBellItemConfig {
  id: string; // Dynamic service ID (e.g. 'water', 'cutlery', 'service_ice_bucket')
  title: string;
  icon: string;
  description: string;
  price: number; // 0 = Free, > 0 = Paid add-on
  isEnabled: boolean;
}

export interface TableServiceRequest {
  id: string;
  kitchenId: string;
  tableNumber: string;
  tableId?: string;
  type: string; // Dynamic service type ID
  title: string;
  price: number;
  guestName?: string;
  status: 'pending' | 'acknowledged' | 'completed' | 'cancelled';
  createdAt: string;
  acknowledgedAt?: string;
  completedAt?: string;
}

export const DEFAULT_SERVICE_BELLS: ServiceBellItemConfig[] = [
  {
    id: 'water',
    title: 'Refill Water',
    icon: '💧',
    description: 'Fresh drinking water refill at table',
    price: 0,
    isEnabled: true,
  },
  {
    id: 'onion_chutney',
    title: 'Extra Onion & Chutney',
    icon: '🧅',
    description: 'Fresh sliced onion rings, green chutney & lemon wedges',
    price: 0,
    isEnabled: true,
  },
  {
    id: 'cutlery',
    title: 'Extra Plates / Cutlery',
    icon: '🍽️',
    description: 'Additional dining plates, spoons, forks or glasses',
    price: 0,
    isEnabled: true,
  },
  {
    id: 'captain',
    title: 'Call Table Captain',
    icon: '🛎️',
    description: 'Request table server or captain to visit table immediately',
    price: 0,
    isEnabled: true,
  },
];

export interface KitchenInventoryItem {
  id: string;
  kitchenId: string;
  name: string;
  category: 'raw_ingredients' | 'proteins' | 'dairy' | 'vegetables' | 'pantry_spices' | 'packaging' | 'beverages' | 'wastage';
  quantity: number;
  unit: 'kg' | 'g' | 'liters' | 'ml' | 'units' | 'packs' | 'boxes';
  minThreshold: number; // Low stock threshold
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastRestockedAt?: string;
  lastUpdated?: string;
  lastUpdatedBy?: string;
  costPerUnit?: number;
  notes?: string;
  connectedMealIds?: string[]; // Menu items / dishes requiring this ingredient
  startingShiftQuantity?: number; // Starting stock when shift opened
}

export type WastageReasonCategory = 
  | 'expired_spoiled'            // Storage expiry, sour, mold or rot
  | 'prep_trim_error'            // Trim waste, slicing defect, kitchen spill
  | 'burnt_overcooked'           // Burnt on grill/tandoor or overcooked
  | 'wrong_preparation'         // Incorrect dish cooked or customer allergy/mod missed
  | 'transit_spill_damage'       // Rider dropped / container seal burst in transit
  | 'customer_cancellation'     // Cancelled after kitchen completed or dispatched
  | 'customer_rejected_return'  // Customer refused delivery / food cold dispute
  | 'storage_temp_breach'        // Deep freezer / refrigerator temperature breach
  | 'packaging_defect'           // Punctured packaging or seal damage
  | 'contamination';             // Sanitation reject or foreign object

export interface WastageOrderMetadata {
  orderId: string;
  orderDate?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  address?: string;
  deliveryPartnerId?: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  deliveryPartnerVehicle?: string;
  deliveryVehicleNumber?: string;
  orderTotal?: number;
  itemsSummary?: string;
  orderStatus?: string;
  fulfillmentMode?: 'delivery' | 'takeaway' | 'dine_in';
  quickActionTaken?: string;
}

export interface KitchenWastageRecord {
  id: string;
  kitchenId: string;
  kitchenName?: string;
  type: 'ingredient' | 'whole_dish' | 'order';
  
  // Target item details
  targetId: string; // ingredientId, mealId, or orderId
  targetName: string; // e.g. "Chicken Breast Trimmed", "Tandoori Bhatti Paneer Tikka", or "Order #TB-94182"
  category?: string; // e.g. 'proteins', 'vegetables', 'raw_ingredients', 'Main Course', etc.
  
  quantity: number; // e.g. 1.5 kg or 2 dishes or 1 order
  unit: string; // 'kg', 'g', 'liters', 'units', 'dishes', 'orders'
  
  // Financial loss
  unitCost?: number; // Cost per unit (e.g. ₹220/kg or ₹180 dish cost)
  financialLoss: number; // Total loss in ₹
  
  // Wastage reasoning & disposition
  reasonCategory: WastageReasonCategory;
  reasonNotes?: string;
  dispositionAction: 'discarded' | 'returned_to_vendor' | 'composted' | 'staff_meal' | 'bio_waste';
  
  // If whole order waste
  orderMetadata?: WastageOrderMetadata;
  
  // Audit trail
  loggedBy: string; // Kitchen Manager name or Admin name
  loggedAt: string; // ISO string
  reportDate: string; // YYYY-MM-DD
  shiftType?: 'morning' | 'evening' | 'full_day';
  status: 'logged' | 'verified_by_audit' | 'written_off';
}

export interface KitchenEODReport {
  id: string;
  reportDate: string; // e.g. "2026-09-04"
  closedAt: string; // ISO timestamp
  kitchenId: string;
  kitchenName: string;
  managerId: string;
  managerName: string;
  shiftType: 'morning' | 'evening' | 'full_day';
  
  // 1. Order & Fulfillment Metrics
  totalOrdersReceived: number;
  totalOrdersFulfilled: number;
  totalOrdersCancelled: number;
  takeawayOrdersCount: number;
  deliveryOrdersCount: number;
  grossRevenue: number;
  
  // 2. Prep Speed & Stations
  avgPrepTimeMinutes: number;
  laneAPrepCount: number; // Veg Sauté
  laneBPrepCount: number; // Meat Grill
  peakRushBufferUsedMinutes: number;
  
  // 3. Financial & Cash Reconciliation
  codCollectedByFleet: number;
  cashDepositedAtKitchen: number;
  cashReconciliationVariance: number; // cashDepositedAtKitchen - codCollectedByFleet
  prepaidRevenue: number;
  
  // 4. Wastage & Food Loss Reconciliation (Enterprise QSR Standard)
  totalWastageLoss: number; // Total ₹ lost to waste
  rawMaterialWastageLoss: number; // ₹ lost in raw ingredients/prep
  finishedGoodsWastageLoss: number; // ₹ lost in whole dishes/orders
  totalWastageItemsCount: number; // Total items/entries wasted
  wastagePctOfRevenue: number; // (totalWastageLoss / grossRevenue) * 100
  wastageBreakdownByReason?: {
    reasonCategory: string;
    count: number;
    totalLoss: number;
  }[];
  wastedItemsList?: {
    id: string;
    type: 'ingredient' | 'whole_dish' | 'order';
    name: string;
    quantity: number;
    unit: string;
    financialLoss: number;
    reason: string;
    loggedAt: string;
  }[];

  // Shift Remarks & Inventory Metrics
  depletedStockItems?: {
    name: string;
    category: string;
    depletedAmount: number;
    unit: string;
    currentQuantity: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
  }[];
  outOfStockItemsCount?: number;
  autoDisabledDishesCount?: number;

  notes?: string;
  status: 'settled' | 'audited';
}

export interface SupportTicket {
  id: string;
  ticketSource?: 'customer' | 'delivery_partner';
  userId?: string;
  userEmail: string;
  userName: string;
  userPhone?: string;

  // Delivered Rider & Logistics Details (for orders delivered by partners)
  deliveryPartnerId?: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  deliveryPartnerEmail?: string;
  deliveryPartnerVehicle?: string;
  deliveryVehicleNumber?: string;
  deliveredAt?: string;
  riderAssigned?: boolean;
  assignedKitchenId?: string;
  assignedKitchenName?: string;
  assignedCity?: string;
  deliveryCity?: string;

  // Attached Order Details
  orderId?: string;
  orderDate?: string;
  orderTotal?: number;
  orderStatus?: string;
  orderItemsSummary?: string;
  orderDeliveryAddress?: string;
  orderPaymentMethod?: string;
  orderFulfillmentMode?: 'delivery' | 'takeaway';
  orderDeliveryRating?: number;
  orderFeedbackTags?: string[];

  type: 'complaint' | 'feedback' | 'suggestion' | 'inquiry';
  category: 'food_quality' | 'delivery_delay' | 'wrong_item' | 'app_bug' | 'billing' | 'general' | 'customer_unreachable' | 'wrong_address' | 'restaurant_delay' | 'payment_dispute' | 'vehicle_breakdown' | 'harassment' | 'safety_emergency' | 'app_technical_issue' | 'incentive_payout' | 'general_delivery';
  deliveryCategory?: 'customer_unreachable' | 'wrong_address' | 'restaurant_delay' | 'payment_dispute' | 'vehicle_breakdown' | 'harassment' | 'safety_emergency' | 'app_technical_issue' | 'incentive_payout' | 'general_delivery';
  subject: string;
  message: string;
  imageUrl?: string;
  attachments?: string[];
  rating?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'under_review' | 'resolved' | 'closed';
  adminReply?: string;
  adminRepliedAt?: string;
  adminName?: string;
  createdAt: string;
  updatedAt?: string;
  unreadByCustomer?: boolean;
  unreadByPartner?: boolean;
  unreadByDeliveryPartner?: boolean;
  unreadByAdmin?: boolean;
  isEmergency?: boolean;
  isCallRequest?: boolean;
  callRequestReason?: string;
  callStatus?: 'pending_call' | 'calling' | 'completed' | 'unreachable';
}

export interface AppFeatureFlags {
  enableMenuTab: boolean;
  enableDealsTab: boolean;
  enableWalletSection: boolean;
  enableKitchensTab: boolean;
  enableTakeawayOrdering: boolean;
  enableDeliveryOrdering: boolean;
  enableCoupons: boolean;
  acceptingOrders: boolean;
  closedOrderMessage?: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  disabledCategories?: string[];
  disabledDishIds?: string[];
  tabDisables?: Record<string, boolean>;
  headerComponents?: {
    logo?: boolean;
    location?: boolean;
    deck?: boolean;
    notifications?: boolean;
    mailbox?: boolean;
    cart?: boolean;
    progressBar?: boolean;
  };
}

export interface SupportAgent {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'overall' | 'kitchen' | 'city' | 'delivery_support_global' | 'delivery_support_city';
  deliveryScope?: 'global' | 'city';
  assignedKitchenId?: string;
  assignedKitchenName?: string;
  assignedCity?: string;
  status: 'active' | 'inactive';
  registeredAt?: string;
  createdAt?: string;
  firebaseAuthSynced?: boolean;
  firebaseUid?: string;
  banned?: boolean;
}

export interface KitchenManager {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  assignedKitchenId: string;
  assignedKitchenName: string;
  status: 'active' | 'inactive';
  registeredAt?: string;
  createdAt?: string;
  firebaseAuthSynced?: boolean;
  firebaseUid?: string;
  banned?: boolean;
  lastLoginAt?: string;
  role: 'kitchen_manager';
}

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  image?: string;
  linkUrl?: string; // internal tab e.g. 'menu', 'catering', 'coach' or external URL
  buttonText?: string;
  bgGradient?: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  category?: 'promo' | 'order_update' | 'chef_special' | 'event' | 'system';
  targetAudience?: 'all' | 'vip' | 'city' | 'selected_users' | 'no_permissions';
  targetCity?: string;
  targetUserIds?: string[];
  imageUrl?: string;
  linkUrl?: string; // e.g. 'menu', 'catering', 'coupons', 'orders' or external URL
  buttonText?: string;
  sentByEmail?: string;
  sentAt: string;
  readBy?: string[]; // array of user uids or emails who read it
}

export interface UserNotificationPreferences {
  pushEnabled: boolean;
  promptChoice: 'enabled' | 'later' | 'never';
  lastPromptAt?: string;
}

export interface LegalSection {
  id: string;
  title: string;
  content: string;
  subpoints?: string[];
}

export interface LegalDocument {
  id: 'terms_and_conditions' | 'privacy_policy';
  title: string;
  tagline: string;
  lastUpdated: string;
  version: string;
  summary: string;
  sections: LegalSection[];
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  updatedAt?: string;
  updatedBy?: string;
}

