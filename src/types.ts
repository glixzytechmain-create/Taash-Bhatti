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
}

export interface User {
  id?: string;
  name: string;
  email: string;
  phone?: string;
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

export interface Order {
  id: string;
  items: OrderItem[];
  date: string;
  status: 'sent' | 'kitchen_accepted' | 'cooking' | 'prepared' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'cancelled';
  fulfillmentMode?: 'delivery' | 'takeaway'; // Delivery vs Self-Pickup (Takeaway) - strictly NO Dine-in
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
  deliveredAt?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryOtp?: string;
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

export interface Kitchen {
  id: string;
  name: string;
  address: string;
  city?: string;
  lat: number;
  lng: number;
  geofenceRadius: number; // in km
  registeredAt?: string;
  isActive?: boolean;
  isTakingOrders?: boolean;
  globalPrepDelayMinutes?: number; // Kitchen-wide prep time adjustment/delay in minutes
  isRaining?: boolean; // Kitchen Manager toggle: Currently Raining Mode
  rainDelayMinutes?: number; // Extra delay minutes when raining
  phone?: string;
  managerName?: string;
}

export interface KitchenInventoryItem {
  id: string;
  kitchenId: string;
  name: string;
  category: 'raw_ingredients' | 'proteins' | 'dairy' | 'vegetables' | 'pantry_spices' | 'packaging' | 'beverages';
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

