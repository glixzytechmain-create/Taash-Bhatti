/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Meal, Gym, Offer, FAQ, SubscriptionPlan, DeliveryPartner, HeroBanner } from './types';

export const DEFAULT_HERO_BANNERS: HeroBanner[] = [
  {
    id: 'b1',
    badge: '👑 THE ORIGINAL SIGNATURE',
    title: 'Champaran Mutton & Chicken Taash on Cast Iron',
    subtitle: 'Marinated in cold-pressed kachi ghani mustard oil, pan-seared over glowing bhatti fire & served over crunchy spiced Bhunja.',
    buttonText: 'Order Signature Taash ➜',
    linkUrl: 'menu',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
    isActive: true,
    order: 1,
  },
  {
    id: 'b2',
    badge: '🔥 SLOW BHATTI DUM',
    title: 'Champaran Ahuna Handi Mutton & Clay Pot Biryani',
    subtitle: 'Slow-cooked inside sealed earthen pots over wood embers with whole garlic bulbs and stone-ground khada masalas.',
    buttonText: 'Order Ahuna Handi Now ➜',
    linkUrl: 'menu',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fresh-spicy-food-dish-slow-cooked-in-pan-43098-large.mp4',
    mediaType: 'video',
    aspectRatio: '16:9',
    isActive: true,
    order: 2,
  },
  {
    id: 'b3',
    badge: '🌯 STREET SIZZLE',
    title: 'Smoky Taash Paratha Rolls & Meal Combos',
    subtitle: 'Charred, juicy Taash cuts rolled in hot flaky ghee laccha parathas with fresh mint chutney & lemon-pickled onions.',
    buttonText: 'Explore Taash Rolls ➜',
    linkUrl: 'menu',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80',
    isActive: true,
    order: 3,
  },
  {
    id: 'b4',
    badge: '🎉 PARTY & EVENT CATERING',
    title: 'Live Bhatti Sizzle & Catering for 10 to 100+ Guests',
    subtitle: 'Grand Taash platters, Ahuna handi feasts, and custom party boxes with up to 20% OFF group pricing!',
    buttonText: 'Plan Bhatti Catering ➜',
    linkUrl: 'catering',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    isActive: true,
    order: 4,
  },
];

export const MEALS_DATA: Meal[] = [
  {
    id: 'm1',
    name: 'Original Champaran Mutton Taash Platter',
    description: 'The Crown Jewel of Taash Bhatti. Boneless, tender goat mutton marinated in raw cold-pressed kachi ghani mustard oil and stone-pounded spices, slow-crisped on a heavy concave cast-iron tawa. Served sizzling hot over a bed of crunchy spiced Bhunja, pickled laccha onions, green chilies & lemon.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    video: 'https://assets.mixkit.co/videos/preview/mixkit-fresh-spicy-food-dish-slow-cooked-in-pan-43098-large.mp4',
    showcaseMediaType: 'video',
    aspectRatio: '4:3',
    focalPoint: 'center',
    gallery: [
      {
        id: 'm1-vid',
        type: 'video',
        url: 'https://assets.mixkit.co/videos/preview/mixkit-fresh-spicy-food-dish-slow-cooked-in-pan-43098-large.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
        caption: 'Cast-Iron Tawa Sizzle on High Bhatti Flame',
      },
      {
        id: 'm1-img1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
        caption: 'Crisp Charred Mutton Taash on Spiced Bhunja',
      },
      {
        id: 'm1-img2',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
        caption: 'Authentic Champaran Khada Masala Rub',
      },
    ],
    price: 449,
    calories: 520,
    protein: 42,
    carbs: 28,
    fats: 22,
    isVeg: false,
    isVegan: false,
    goals: ['chef_signature', 'gourmet_special'],
    timings: ['lunch', 'dinner', 'snack'],
    spicyLevel: 'spicy',
    popularity: 99,
    prepTimeMinutes: 20,
    goesWellWith: ['m10', 'm11', 'm12', 'm13'],
    ingredients: [
      { name: 'Prime Boneless Goat Meat', grams: 220 },
      { name: 'Spiced Puffed Bhunja', grams: 80 },
      { name: 'Cold-Pressed Mustard Oil', grams: 25 },
      { name: 'Hand-Pounded Khada Masala', grams: 15 }
    ]
  },
  {
    id: 'm2',
    name: 'Fiery Cast-Iron Chicken Taash',
    description: 'Juicy boneless chicken thigh cuts flash-seared on a smoking iron tawa with crushed black pepper, toasted cumin, garlic, and pungent mustard oil. Roasted until the exterior is deeply browned with crispy edges while staying succulent inside. Served over seasoned crunchy Bhunja.',
    image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&auto=format&fit=crop&q=80',
    video: 'https://assets.mixkit.co/videos/preview/mixkit-chicken-meat-cooked-in-pan-43099-large.mp4',
    showcaseMediaType: 'image',
    aspectRatio: '4:3',
    focalPoint: 'center',
    gallery: [
      {
        id: 'm2-img1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&auto=format&fit=crop&q=80',
        caption: 'Char-Seared Chicken Taash Bites',
      },
      {
        id: 'm2-vid1',
        type: 'video',
        url: 'https://assets.mixkit.co/videos/preview/mixkit-chicken-meat-cooked-in-pan-43099-large.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&auto=format&fit=crop&q=80',
        caption: 'High-Heat Iron Griddle Tossing',
      },
    ],
    price: 349,
    calories: 460,
    protein: 44,
    carbs: 24,
    fats: 16,
    isVeg: false,
    isVegan: false,
    goals: ['chef_signature', 'gourmet_special'],
    timings: ['lunch', 'dinner', 'snack'],
    spicyLevel: 'medium',
    popularity: 96,
    prepTimeMinutes: 18,
    goesWellWith: ['m10', 'm11', 'm12', 'm6'],
    ingredients: [
      { name: 'Boneless Chicken Thigh Cuts', grams: 220 },
      { name: 'Seasoned Bhunja & Chura', grams: 80 },
      { name: 'Kachi Ghani Mustard Oil', grams: 20 }
    ]
  },
  {
    id: 'm3',
    name: 'Sizzling Bhatti Paneer Taash',
    description: 'Fresh malai paneer cubes tossed over blistering cast iron with freshly ground roasted spices, crushed coriander seeds, garlic juliennes, and a golden mustard glaze. Crispy, spicy edges with a soft, melt-in-mouth center, served over crisp masala Bhunja.',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    video: 'https://assets.mixkit.co/videos/preview/mixkit-vegetables-sizzling-in-a-pan-43097-large.mp4',
    showcaseMediaType: 'video',
    aspectRatio: '4:3',
    focalPoint: 'center',
    gallery: [
      {
        id: 'm3-img1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
        caption: 'Sizzling Malai Paneer Taash on Iron Tawa',
      },
      {
        id: 'm3-vid1',
        type: 'video',
        url: 'https://assets.mixkit.co/videos/preview/mixkit-vegetables-sizzling-in-a-pan-43097-large.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
        caption: 'Bhatti Flame Stir-Fry Action',
      },
    ],
    price: 299,
    calories: 410,
    protein: 26,
    carbs: 30,
    fats: 20,
    isVeg: true,
    isVegan: false,
    goals: ['chef_signature', 'quick_bites'],
    timings: ['lunch', 'dinner', 'snack'],
    spicyLevel: 'medium',
    popularity: 91,
    prepTimeMinutes: 15,
    goesWellWith: ['m10', 'm11', 'm12'],
    ingredients: [
      { name: 'Fresh Malai Paneer', grams: 200 },
      { name: 'Crunchy Bhunja', grams: 70 },
      { name: 'Mustard Oil & Spices', grams: 20 }
    ]
  },
  {
    id: 'm4',
    name: 'Champaran Ahuna Dum Handi Mutton',
    description: 'Authentic clay-pot delicacy from Champaran. Prime tender goat meat sealed with wheat dough inside unglazed earthen clay pots with whole roasted garlic heads, whole shallots, and fragrant bay leaves. Slow-cooked over glowing bhatti wood coals for 3 hours until falling apart.',
    image: 'https://images.unsplash.com/photo-1545247181-516773cae754?w=600&auto=format&fit=crop&q=80',
    price: 529,
    calories: 580,
    protein: 48,
    carbs: 14,
    fats: 28,
    isVeg: false,
    isVegan: false,
    goals: ['gourmet_special', 'chef_signature'],
    timings: ['lunch', 'dinner'],
    spicyLevel: 'medium',
    popularity: 97,
    prepTimeMinutes: 25,
    goesWellWith: ['m11', 'm8', 'm13'],
    ingredients: [
      { name: 'Champaran Pot Goat Mutton', grams: 300 },
      { name: 'Whole Garlic Bulbs', grams: 50 },
      { name: 'Pure Mustard Gravy Base', grams: 150 }
    ]
  },
  {
    id: 'm5',
    name: 'Clay-Pot Ahuna Chicken Handi',
    description: 'Rustic farm chicken simmered in clay handis over low ember heat. Cooked in pure mustard oil with whole crushed spices, roasted garlic bulbs, and sweet shallots. Unsealed at your doorstep releasing an earthy, intoxicating aroma.',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80',
    price: 399,
    calories: 490,
    protein: 46,
    carbs: 16,
    fats: 22,
    isVeg: false,
    isVegan: false,
    goals: ['gourmet_special'],
    timings: ['lunch', 'dinner'],
    spicyLevel: 'medium',
    popularity: 94,
    prepTimeMinutes: 22,
    goesWellWith: ['m11', 'm9', 'm12'],
    ingredients: [
      { name: 'Farm Chicken Cuts', grams: 320 },
      { name: 'Whole Garlic & Shallots', grams: 60 },
      { name: 'Handi Clay Reduction', grams: 120 }
    ]
  },
  {
    id: 'm6',
    name: 'Smoky Mutton Taash Laccha Paratha Roll',
    description: 'Sizzling iron-tawa mutton taash rolled inside a flaky, ghee-crisped whole wheat laccha paratha with fiery mint-coriander chutney, julienned ginger, and lemon-pickled crunchy onions.',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80',
    price: 249,
    calories: 480,
    protein: 32,
    carbs: 42,
    fats: 18,
    isVeg: false,
    isVegan: false,
    goals: ['quick_bites', 'chef_signature'],
    timings: ['lunch', 'dinner', 'snack'],
    spicyLevel: 'spicy',
    popularity: 95,
    prepTimeMinutes: 15,
    goesWellWith: ['m12', 'm13'],
    ingredients: [
      { name: 'Cast-Iron Mutton Taash', grams: 120 },
      { name: 'Ghee Tawa Laccha Paratha', grams: 90 },
      { name: 'Spicy Chutney & Laccha Pyaz', grams: 30 }
    ]
  },
  {
    id: 'm7',
    name: 'Cast-Iron Chicken Taash Roll',
    description: 'Juicy, charred chicken taash folded into a hot handmade crispy tawa paratha, finished with fresh green chili crush, roasted cumin glaze, and lemon-drizzled onions. The quintessential on-the-go feast.',
    image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80',
    price: 199,
    calories: 420,
    protein: 28,
    carbs: 40,
    fats: 14,
    isVeg: false,
    isVegan: false,
    goals: ['quick_bites'],
    timings: ['lunch', 'dinner', 'snack'],
    spicyLevel: 'medium',
    popularity: 93,
    prepTimeMinutes: 15,
    goesWellWith: ['m12', 'm13'],
    ingredients: [
      { name: 'Crisp Chicken Taash', grams: 110 },
      { name: 'Handmade Tawa Paratha', grams: 85 },
      { name: 'Mint Chutney & Onions', grams: 25 }
    ]
  },
  {
    id: 'm8',
    name: 'Bhatti Mutton Handi Dum Biryani',
    description: 'Royal long-grain aged basmati rice layered with juicy marinated goat mutton, saffron-infused milk, and fried shallots, sealed in earthen handis and slow-steamed over bhatti wood coals. Served with smoky burani garlic raita.',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    price: 449,
    calories: 650,
    protein: 38,
    carbs: 68,
    fats: 22,
    isVeg: false,
    isVegan: false,
    goals: ['gourmet_special', 'chef_signature'],
    timings: ['lunch', 'dinner'],
    spicyLevel: 'medium',
    popularity: 98,
    prepTimeMinutes: 25,
    goesWellWith: ['m1', 'm13', 'm10'],
    ingredients: [
      { name: 'Aged Basmati Rice', grams: 220 },
      { name: 'Tender Goat Mutton', grams: 200 },
      { name: 'Pure Cow Ghee & Saffron', grams: 25 }
    ]
  },
  {
    id: 'm9',
    name: 'Champaran Chicken Dum Biryani',
    description: 'Fragrant basmati rice cooked on slow dum with tender chicken pieces, caramelized onions, whole spices, and pure ghee inside clay handis. Every grain infused with rich bhatti smoke.',
    image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80',
    price: 349,
    calories: 590,
    protein: 36,
    carbs: 65,
    fats: 18,
    isVeg: false,
    isVegan: false,
    goals: ['gourmet_special'],
    timings: ['lunch', 'dinner'],
    spicyLevel: 'medium',
    popularity: 92,
    prepTimeMinutes: 20,
    goesWellWith: ['m2', 'm13', 'm11'],
    ingredients: [
      { name: 'Aged Basmati Rice', grams: 200 },
      { name: 'Farm Chicken Cuts', grams: 190 },
      { name: 'Burani Raita Serving', grams: 80 }
    ]
  },
  {
    id: 'm10',
    name: 'Signature Masala Bhunja & Chura Crunch',
    description: 'The authentic accompaniment to Taash! Golden-roasted puffed rice (muri) and flattened rice (chura) tossed in cold-pressed mustard oil with roasted peanuts, green chilies, rock salt, and roasted cumin powder. Unbelievably crunchy and addictive.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
    price: 99,
    calories: 210,
    protein: 6,
    carbs: 36,
    fats: 5,
    isVeg: true,
    isVegan: true,
    goals: ['quick_bites'],
    timings: ['snack', 'lunch', 'dinner'],
    spicyLevel: 'mild',
    popularity: 89,
    prepTimeMinutes: 5,
    goesWellWith: ['m1', 'm2', 'm3'],
    ingredients: [
      { name: 'Roasted Puffed Rice (Muri)', grams: 60 },
      { name: 'Crispy Flattened Rice (Chura)', grams: 40 },
      { name: 'Roasted Spiced Peanuts', grams: 25 }
    ]
  },
  {
    id: 'm11',
    name: 'Crispy Ghee Tawa Laccha Paratha (2 Pcs)',
    description: 'Multi-layered whole wheat flatbread griddled on heavy cast iron with generous dollops of pure desi ghee until golden, flaky, and crispy. Perfect for scooping up Taash and Ahuna gravies.',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80',
    price: 79,
    calories: 280,
    protein: 8,
    carbs: 38,
    fats: 12,
    isVeg: true,
    isVegan: false,
    goals: ['quick_bites'],
    timings: ['lunch', 'dinner'],
    spicyLevel: 'mild',
    popularity: 94,
    prepTimeMinutes: 10,
    goesWellWith: ['m1', 'm4', 'm5'],
    ingredients: [
      { name: 'Whole Wheat Chakki Flour', grams: 120 },
      { name: 'Pure Desi Ghee', grams: 25 }
    ]
  },
  {
    id: 'm12',
    name: 'Chilled Spiced Sattu Refresher',
    description: 'Traditional roasted Bengal gram flour blended with chilled water, roasted jeera, black salt, fresh garden mint, and a squeeze of lemon juice. The ultimate rustic cooling digestive to pair with fiery bhatti dishes.',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
    price: 89,
    calories: 140,
    protein: 9,
    carbs: 22,
    fats: 2,
    isVeg: true,
    isVegan: true,
    goals: ['quick_bites'],
    timings: ['lunch', 'snack', 'dinner'],
    spicyLevel: 'mild',
    popularity: 90,
    prepTimeMinutes: 5,
    goesWellWith: ['m1', 'm2', 'm6'],
    ingredients: [
      { name: 'Stone-Ground Roasted Sattu', grams: 40 },
      { name: 'Chilled Water & Fresh Mint', grams: 250 },
      { name: 'Black Salt & Lemon Juice', grams: 10 }
    ]
  },
  {
    id: 'm13',
    name: 'Dhungar Smoked Masala Chaas',
    description: 'Fresh churned buttermilk infused with charcoal dhungar smoke, crushed green chilies, ginger root, cilantro, and roasted cumin. Cools the palate instantly.',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    price: 69,
    calories: 90,
    protein: 5,
    carbs: 8,
    fats: 3,
    isVeg: true,
    isVegan: false,
    goals: ['quick_bites'],
    timings: ['lunch', 'snack', 'dinner'],
    spicyLevel: 'mild',
    popularity: 92,
    prepTimeMinutes: 5,
    goesWellWith: ['m1', 'm4', 'm8'],
    ingredients: [
      { name: 'Cultured Fresh Buttermilk', grams: 250 },
      { name: 'Roasted Cumin & Black Salt', grams: 8 },
      { name: 'Charcoal Dhungar Infusion', grams: 5 }
    ]
  }
];

export const GYMS_DATA: Gym[] = [];

export const OFFERS_DATA: Offer[] = [
  {
    id: 'o1',
    code: 'TAASH15',
    title: 'First Sizzle Special Discount',
    description: 'Get 15% off on orders above ₹399 across all signature Taash and Ahuna handi items!',
    discountPct: 15,
    minOrder: 399,
    type: 'general'
  }
];

export const FAQS_DATA: FAQ[] = [
  {
    id: 'f1',
    question: 'What is Taash and how is it prepared?',
    answer: 'Taash (also spelled Taas) is an iconic, cult-favorite meat dish originating along the Nepal-Bihar border (Chitwan & Champaran). Boneless cuts of goat mutton or chicken are marinated heavily in raw cold-pressed kachi ghani mustard oil, crushed garlic, and stone-ground spices, then slow-seared on a heavy concave cast-iron tawa over a roaring bhatti. The edges become charred and crispy while the center stays tender and juicy. It is traditionally served piping hot over seasoned crunchy Bhunja (puffed/beaten rice) with sliced onions and green chilies.',
    category: 'quality'
  },
  {
    id: 'f2',
    question: 'Does TAASH BHATTI only sell Taash?',
    answer: 'Taash is our signature hero dish (just like Original Recipe Fried Chicken is to KFC), but we serve a complete, rich culinary ecosystem: Champaran Ahuna Handi curries slow-cooked with whole garlic in dough-sealed clay pots, royal clay-pot dum biryanis, sizzling Taash paratha rolls, and chilled desi sattu digestives.',
    category: 'general'
  },
  {
    id: 'f3',
    question: 'How do you guarantee freshness and sizzle during delivery?',
    answer: 'We prepare your meals fresh upon order over live bhatti fires and package them in specialized multi-layer thermal foil containers. The hot Taash and crunchy Bhunja are packed with moisture-absorbing layers so your Bhunja stays crisp and the meat stays sizzling hot until it reaches your door.',
    category: 'delivery'
  },
  {
    id: 'f4',
    question: 'What oil and spices do you use in your bhatti?',
    answer: 'We strictly use 100% pure cold-pressed Kachi Ghani mustard oil and whole spices roasted and ground in-house. We maintain a zero reused oil policy and never use artificial tenderizers, synthetic dyes, or MSG.',
    category: 'quality'
  }
];

export const SUBSCRIPTIONS_DATA: SubscriptionPlan[] = [
  {
    id: 's1',
    name: 'Bhatti Weekly Feast',
    description: 'Fresh signature Taash platters, Ahuna handi curries, and rolls delivered across 6 days.',
    mealsCount: 6,
    price: 1899,
    features: ['6 Signature Bhatti meals', 'Free thermal-pouch delivery', 'Flexible meal pausing', 'Priority kitchen dispatch'],
    popular: false
  },
  {
    id: 's2',
    name: "Master Chef's Grand Bhatti Plan",
    description: 'Complete dining plan with signature Taash platters, Ahuna handis, biryanis, and desi coolers.',
    mealsCount: 12,
    price: 3499,
    features: ['12 Premium bhatti specialties', 'Includes fresh sattu coolers & chaas', 'Free express home delivery', 'Customize spice levels'],
    popular: true
  },
  {
    id: 's3',
    name: 'Monthly Meat Lovers Club',
    description: 'The ultimate monthly feast pass for true carnivores and Champaran food connoisseurs.',
    mealsCount: 24,
    price: 6499,
    features: ['24 Signature meals across 30 days', 'Unlimited delivery pausing', 'Exclusive secret weekend cuts', 'Dedicated VIP concierge support'],
    popular: false
  }
];

export const INITIAL_DELIVERY_PARTNERS: DeliveryPartner[] = [];
