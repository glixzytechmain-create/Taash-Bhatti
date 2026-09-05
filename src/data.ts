/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Meal, Gym, Offer, FAQ, SubscriptionPlan, DeliveryPartner, HeroBanner } from './types';

export const DEFAULT_HERO_BANNERS: HeroBanner[] = [
  {
    id: 'b1',
    badge: '🎉 PARTY & EVENT CATERING',
    title: 'Clay-Oven Tandoori Platters for 10 to 100+ Guests',
    subtitle: 'Auto-calculate headcounts, build custom box combos, and save up to 20% OFF with bulk tier pricing!',
    buttonText: 'Plan Party Catering ➜',
    linkUrl: 'catering',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
    isActive: true,
    order: 1,
  },
  {
    id: 'b2',
    badge: '🔥 CHEF SPECIAL',
    title: 'Handi Dum Biryani & Smoked Charcoal Kebabs',
    subtitle: 'Sealed in traditional clay handis with pure ghee & Kashmiri saffron fragrance. Delivered scalding hot.',
    buttonText: 'Order Clay Handi Now ➜',
    linkUrl: 'menu',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
    isActive: true,
    order: 2,
  },
  {
    id: 'b3',
    badge: '🤖 SMART CULINARY CHEF',
    title: 'Not sure what to crave today?',
    subtitle: 'Let our AI Chef analyze your dietary preference and suggest a personalized smoked Tandoori box!',
    buttonText: 'Ask AI Chef ➜',
    linkUrl: 'coach',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    isActive: true,
    order: 3,
  },
  {
    id: 'b4',
    badge: '👑 TAASH BHATTI CLUB',
    title: 'Exclusive Member Discounts & Live Order Tracking',
    subtitle: 'Save addresses, earn reward points, and view live tandoor kitchen preparation in real-time.',
    buttonText: 'Sign In / Join Free ➜',
    linkUrl: 'account',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
    isActive: true,
    order: 4,
  },
];

export const MEALS_DATA: Meal[] = [
  {
    id: 'm1',
    name: 'Saffron-Infused Tandoori Paneer Platter',
    description: 'Fresh grilled low-fat paneer cubes marinated in saffron-infused spices, served over a bed of spinach quinoa and roasted bell peppers.',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    price: 349,
    calories: 420,
    protein: 26,
    carbs: 38,
    fats: 14,
    isVeg: true,
    isVegan: false,
    goals: ['gourmet_special', 'muscle_gain'],
    timings: ['lunch', 'dinner'],
    spicyLevel: 'medium',
    popularity: 95,
    prepTimeMinutes: 20,
    ingredients: [
      { name: 'Organic Paneer', grams: 120 },
      { name: 'Saffron Quinoa', grams: 150 },
      { name: 'Mixed Bell Peppers', grams: 80 }
    ]
  },
  {
    id: 'm2',
    name: 'Herb-Grilled Chicken & Roasted Veggies',
    description: 'Tender free-range chicken breast griddled with fresh aromatic herbs, served with steam-locked broccoli florets and brown jasmine rice.',
    image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&auto=format&fit=crop&q=80',
    price: 389,
    calories: 460,
    protein: 42,
    carbs: 32,
    fats: 12,
    isVeg: false,
    isVegan: false,
    goals: ['muscle_gain', 'fat_loss'],
    timings: ['lunch', 'dinner'],
    spicyLevel: 'mild',
    popularity: 98,
    prepTimeMinutes: 25,
    ingredients: [
      { name: 'Tender Chicken Breast', grams: 180 },
      { name: 'Steam Broccoli', grams: 120 },
      { name: 'Brown Jasmine Rice', grams: 100 }
    ]
  },
  {
    id: 'm3',
    name: 'Saffron Oats & Almond Delight Shake',
    description: 'Steel-cut oats soaked overnight in almond milk with wild Kashmiri saffron threads and natural organic honey.',
    image: 'https://images.unsplash.com/photo-1536304997881-a372c179924b?w=600&auto=format&fit=crop&q=80',
    price: 249,
    calories: 310,
    protein: 14,
    carbs: 45,
    fats: 8,
    isVeg: true,
    isVegan: false,
    goals: ['chef_signature', 'post_workout'],
    timings: ['breakfast', 'snack'],
    spicyLevel: 'mild',
    popularity: 88,
    prepTimeMinutes: 10,
    ingredients: [
      { name: 'Steel Cut Oats', grams: 60 },
      { name: 'Almond Milk', grams: 200 },
      { name: 'Kashmiri Saffron', grams: 1 }
    ]
  },
  {
    id: 'm4',
    name: 'Smoked Lamb Keema Roll & Mint Chutney',
    description: 'Fresh lean minced lamb slow-smoked over hickory, tossed in gourmet spices, wrapped in a warm whole wheat tortilla.',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80',
    price: 399,
    calories: 490,
    protein: 34,
    carbs: 36,
    fats: 18,
    isVeg: false,
    isVegan: false,
    goals: ['gourmet_special', 'chef_signature'],
    timings: ['lunch', 'dinner', 'snack'],
    spicyLevel: 'spicy',
    popularity: 92,
    prepTimeMinutes: 20,
    ingredients: [
      { name: 'Lean Minced Lamb', grams: 130 },
      { name: 'Whole Wheat Tortilla', grams: 70 },
      { name: 'Mint Chutney', grams: 20 }
    ]
  },
  {
    id: 'm5',
    name: 'Avocado & Grilled Tofu Fresh Salad',
    description: 'Double-grilled organic tofu squares paired with Hass avocado slices on a crisp bed of kale, spinach, and toasted pumpkin seeds.',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80',
    price: 329,
    calories: 340,
    protein: 22,
    carbs: 18,
    fats: 20,
    isVeg: true,
    isVegan: true,
    goals: ['fresh_salads', 'fat_loss'],
    timings: ['lunch', 'dinner'],
    spicyLevel: 'mild',
    popularity: 84,
    prepTimeMinutes: 15,
    ingredients: [
      { name: 'Organic Tofu', grams: 150 },
      { name: 'Hass Avocado', grams: 80 },
      { name: 'Organic Greens Mix', grams: 100 }
    ]
  },
  {
    id: 'm6',
    name: 'Zesty Garlic Shrimp Quinoa Bowl',
    description: 'Juicy sautéed garlic prawns tossed with fresh lemon zest, cracked red chili flakes, and organic Peruvian white quinoa salad.',
    image: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=600&auto=format&fit=crop&q=80',
    price: 449,
    calories: 380,
    protein: 36,
    carbs: 34,
    fats: 10,
    isVeg: false,
    isVegan: false,
    goals: ['gourmet_special', 'muscle_gain'],
    timings: ['lunch', 'dinner'],
    spicyLevel: 'medium',
    popularity: 90,
    prepTimeMinutes: 20,
    ingredients: [
      { name: 'Atlantic Prawns', grams: 140 },
      { name: 'Peruvian Quinoa', grams: 120 },
      { name: 'Garlic Herb Dressing', grams: 15 }
    ]
  },
  {
    id: 'm7',
    name: 'Matcha Mint Fluffy Pancakes',
    description: 'Three fluffy pancakes infused with culinary matcha tea green powders, fresh garden mint leaf, and organic maple syrup.',
    image: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&auto=format&fit=crop&q=80',
    price: 299,
    calories: 350,
    protein: 12,
    carbs: 56,
    fats: 7,
    isVeg: true,
    isVegan: true,
    goals: ['quick_bites'],
    timings: ['breakfast'],
    spicyLevel: 'mild',
    popularity: 81,
    prepTimeMinutes: 15,
    ingredients: [
      { name: 'Fluffy Pancake Mix', grams: 90 },
      { name: 'Culinary Matcha', grams: 5 },
      { name: 'Fresh Mint Extract', grams: 3 }
    ]
  },
  {
    id: 'm8',
    name: 'Pan-Seared Salmon Filet with Herb Butter',
    description: 'Premium fresh-water salmon steak griddled with garlic herbs, served with asparagus spears and sweet potato mash.',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&auto=format&fit=crop&q=80',
    price: 549,
    calories: 520,
    protein: 44,
    carbs: 24,
    fats: 22,
    isVeg: false,
    isVegan: false,
    goals: ['chef_signature', 'muscle_gain'],
    timings: ['lunch', 'dinner'],
    spicyLevel: 'medium',
    popularity: 97,
    prepTimeMinutes: 25,
    ingredients: [
      { name: 'Fresh Salmon Steak', grams: 160 },
      { name: 'Sweet Potato Mash', grams: 110 },
      { name: 'Asparagus Spears', grams: 60 }
    ]
  }
];

export const GYMS_DATA: Gym[] = [];

export const OFFERS_DATA: Offer[] = [
  {
    id: 'o1',
    code: 'GOURMET15',
    title: 'Gourmet Special Discount',
    description: 'Enjoy 15% off on orders above ₹400 across all kitchen menu items!',
    discountPct: 15,
    minOrder: 400,
    type: 'general'
  }
];

export const FAQS_DATA: FAQ[] = [
  {
    id: 'f1',
    question: 'How does TAASH BHATTI food delivery work?',
    answer: 'We prepare your meals fresh upon order in our sanitized cloud kitchens and deliver them directly to your doorstep in thermal-insulated eco pouches to ensure scalding-hot or crisp-fresh quality.',
    category: 'delivery'
  },
  {
    id: 'f2',
    question: 'How do you guarantee ingredients freshness?',
    answer: 'All vegetables, herbs, meats, and dairy are sourced daily from certified local organic farms. Meals are cooked to order with zero preservative additives or artificial food dyes.',
    category: 'quality'
  },
  {
    id: 'f3',
    question: 'Can I cancel or pause my subscription plan?',
    answer: 'Absolutely. You can pause or skip any delivery in your meal plan up to 12 hours before the scheduled time directly from your Account Settings. No cancellation fees apply.',
    category: 'general'
  },
  {
    id: 'f4',
    question: 'What are the delivery hours?',
    answer: 'We deliver freshly cooked meals thrice daily: Breakfast (7:00 AM - 9:30 AM), Lunch (12:00 PM - 2:30 PM), and Dinner (6:30 PM - 9:30 PM). You can schedule precise 30-minute delivery windows.',
    category: 'delivery'
  }
];

export const SUBSCRIPTIONS_DATA: SubscriptionPlan[] = [
  {
    id: 's1',
    name: 'Weekly Gourmet Delight',
    description: 'Fresh chef-crafted meals delivered daily for lunch or dinner across 6 days.',
    mealsCount: 6,
    price: 1899,
    features: ['6 Chef-special gourmet meals', 'Free thermal-pouch delivery', 'Flexible meal pausing', 'Priority kitchen dispatch'],
    popular: false
  },
  {
    id: 's2',
    name: "Chef's Signature Feast Plan",
    description: 'Complete daily dining plan with premium lunches, dinners, and fresh beverages.',
    mealsCount: 12,
    price: 3499,
    features: ['12 Premium gourmet dishes', 'Includes fresh smoothies & desserts', 'Free home delivery', 'Customize spice levels'],
    popular: true
  },
  {
    id: 's3',
    name: 'Monthly Foodie Pass',
    description: 'Comprehensive monthly plan for food lovers wanting clean, high-grade daily cuisine.',
    mealsCount: 24,
    price: 6499,
    features: ['24 Signature meals across 30 days', 'Unlimited delivery pausing', 'Exclusive access to new seasonal dishes', 'Dedicated concierge support'],
    popular: false
  }
];

export const INITIAL_DELIVERY_PARTNERS: DeliveryPartner[] = [];


