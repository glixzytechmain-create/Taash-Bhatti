import React, { useState, useMemo } from 'react';
import {
  Users,
  PartyPopper,
  Flame,
  ChefHat,
  Plus,
  Minus,
  Check,
  Sparkles,
  UtensilsCrossed,
  Gift,
  ShoppingBag,
  Send,
  Calendar,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Percent,
  CheckCircle2,
  Info,
  Building,
  Home,
  Cake,
  Sparkle
} from 'lucide-react';
import { Meal } from '../types';

interface CateringPlannerTabProps {
  onAddToCart: (meal: Meal, quantity: number) => void;
  onOpenCart?: () => void;
}

interface PlatterItem {
  id: string;
  name: string;
  category: 'starter' | 'main' | 'bread_rice' | 'dessert_drink';
  description: string;
  image: string;
  servesCount: number; // e.g. serves 8-10 people
  weightKg: number; // e.g. 1.5 kg
  price: number;
  isVeg: boolean;
  popular?: boolean;
}

const CATERING_PLATTERS: PlatterItem[] = [
  // Starters
  {
    id: 'cat_p1',
    name: 'Bhatti Paneer Tikka Platter (Party Tray)',
    category: 'starter',
    description: '24 pcs of fresh cottage cheese cubes marinated in yellow chili, mustard oil & charred in clay oven.',
    image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&auto=format&fit=crop&q=80',
    servesCount: 8,
    weightKg: 1.2,
    price: 1199,
    isVeg: true,
    popular: true,
  },
  {
    id: 'cat_p2',
    name: 'Smoked Chicken Malai Tikka Platter',
    category: 'starter',
    description: '24 pcs of velvety chicken breast chunks soaked in cashew paste, cream & cardamom smoke.',
    image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&auto=format&fit=crop&q=80',
    servesCount: 8,
    weightKg: 1.4,
    price: 1399,
    isVeg: false,
    popular: true,
  },
  {
    id: 'cat_p3',
    name: 'Tandoori Mushroom & Veg Galouti Tray',
    category: 'starter',
    description: '18 stuffed tandoori mushrooms + 12 melt-in-mouth Awadhi veg galouti kebabs with mint dip.',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    servesCount: 8,
    weightKg: 1.1,
    price: 1099,
    isVeg: true,
  },
  {
    id: 'cat_p4',
    name: 'Bhatti Mutton Seekh Kabab Tray',
    category: 'starter',
    description: '16 minced spiced lamb skewers grilled over charcoal, sliced with laced onions & lemon squeeze.',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
    servesCount: 8,
    weightKg: 1.3,
    price: 1699,
    isVeg: false,
  },

  // Main Course
  {
    id: 'cat_p5',
    name: 'Clay-Oven Signature Dal Makhani Pot',
    category: 'main',
    description: 'Slow-cooked black lentils simmered overnight for 24 hours with white butter & smoked fenugreek. (Serves 10)',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
    servesCount: 10,
    weightKg: 2.5,
    price: 1299,
    isVeg: true,
    popular: true,
  },
  {
    id: 'cat_p6',
    name: 'Paneer Butter Masala Party Tray',
    category: 'main',
    description: 'Creamy tomato-cashew gravy with pillowy cottage cheese cubes & ginger juliennes.',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80',
    servesCount: 10,
    weightKg: 2.2,
    price: 1499,
    isVeg: true,
  },
  {
    id: 'cat_p7',
    name: 'Handi Dum Chicken Biryani Large Box',
    category: 'main',
    description: 'Aromatic long-grain Saffron Basmati rice layered with bone-in succulent spiced chicken & caramelized onions. (Includes Raita)',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    servesCount: 10,
    weightKg: 3.0,
    price: 1899,
    isVeg: false,
    popular: true,
  },
  {
    id: 'cat_p8',
    name: 'Royal Subz Handi Dum Biryani Box',
    category: 'main',
    description: 'Fragrant basmati rice dum-cooked with garden vegetables, cottage cheese & kewra water. (Includes Burani Raita)',
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
    servesCount: 10,
    weightKg: 2.8,
    price: 1499,
    isVeg: true,
  },

  // Breads & Sides
  {
    id: 'cat_p9',
    name: 'Clay-Oven Tandoori Garlic Naan Basket',
    category: 'bread_rice',
    description: '15 freshly baked garlic butter naans, packed hot in thermal foil insulation.',
    image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&auto=format&fit=crop&q=80',
    servesCount: 10,
    weightKg: 1.0,
    price: 699,
    isVeg: true,
    popular: true,
  },
  {
    id: 'cat_p10',
    name: 'Assorted Bhatti Roti & Laccha Paratha Stack',
    category: 'bread_rice',
    description: '10 Butter Tandoori Rotis + 10 Layered Laccha Parathas + 5 Pudina Parathas.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
    servesCount: 10,
    weightKg: 1.2,
    price: 799,
    isVeg: true,
  },
  {
    id: 'cat_p11',
    name: 'Saffron Jeera Basmati Rice Bucket',
    category: 'bread_rice',
    description: 'Steamed premium basmati rice tempered with cumin, whole ghee & saffron threads.',
    image: 'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=600&auto=format&fit=crop&q=80',
    servesCount: 10,
    weightKg: 2.0,
    price: 599,
    isVeg: true,
  },

  // Desserts & Drinks
  {
    id: 'cat_p12',
    name: 'Chasni Gulab Jamun Party Tray',
    category: 'dessert_drink',
    description: '20 warm, golden khoya gulab jamuns soaked in cardamom saffron syrup.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
    servesCount: 10,
    weightKg: 1.5,
    price: 699,
    isVeg: true,
  },
  {
    id: 'cat_p13',
    name: 'Earthen Matka Phirni Set (12 Pots)',
    category: 'dessert_drink',
    description: '12 individual clay pots of chilled saffron rice pudding garnished with pistachio flakes & silver leaf.',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    servesCount: 12,
    weightKg: 1.8,
    price: 899,
    isVeg: true,
    popular: true,
  },
  {
    id: 'cat_p14',
    name: 'Chilled Kulhad Badam Thandai Jar (3 Liters)',
    category: 'dessert_drink',
    description: '3L fresh almond rose thandai brewed with peppercorns, fennel & saffron. Served cold.',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
    servesCount: 10,
    weightKg: 3.0,
    price: 799,
    isVeg: true,
  },
];

export default function CateringPlannerTab({ onAddToCart, onOpenCart }: CateringPlannerTabProps) {
  // State 1: Event Config
  const [headcount, setHeadcount] = useState<number>(25);
  const [eventType, setEventType] = useState<'house_party' | 'office_lunch' | 'birthday' | 'rooftop_bbq' | 'wedding'>('house_party');
  const [dietRatio, setDietRatio] = useState<'50_50' | '70_30' | '100_veg' | '100_nonveg'>('50_50');

  // State 2: Selected Platter Quantities: record of platterId -> quantity
  const [selectedPlatters, setSelectedPlatters] = useState<Record<string, number>>({
    cat_p1: 2, // Bhatti Paneer Tikka
    cat_p2: 2, // Smoked Chicken Malai Tikka
    cat_p5: 2, // Dal Makhani Pot
    cat_p7: 2, // Handi Dum Biryani
    cat_p9: 2, // Garlic Naan Basket
    cat_p13: 2, // Matka Phirni
  });

  // Category filter for custom builder view
  const [activeCategory, setActiveCategory] = useState<'all' | 'starter' | 'main' | 'bread_rice' | 'dessert_drink'>('all');

  // Custom Quote Modal State
  const [showQuoteModal, setShowQuoteModal] = useState<boolean>(false);
  const [quoteForm, setQuoteForm] = useState({
    name: '',
    phone: '',
    email: '',
    eventDate: '',
    eventTime: '19:30',
    venueAddress: '',
    specialRequests: '',
    needLiveChef: true,
  });
  const [quoteSubmitted, setQuoteSubmitted] = useState<boolean>(false);

  // Success Feedback Toast
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Helper for adjusting headcount
  const handleHeadcountChange = (newCount: number) => {
    const val = Math.max(5, Math.min(200, newCount));
    setHeadcount(val);
  };

  // Automated Suggestion Engine
  const applyRecommendedQuantities = () => {
    // Calculates recommended trays based on headcount
    // Standard rule: 1 starter tray serves ~8 people, 1 main course tray serves ~10 people
    const isPureVeg = dietRatio === '100_veg';
    const isPureNonVeg = dietRatio === '100_nonveg';

    const starterTraysTotal = Math.ceil(headcount / 6); // starters headcount factor
    const mainTraysTotal = Math.ceil(headcount / 8); // mains headcount factor
    const breadBasketsTotal = Math.ceil(headcount / 8);
    const dessertTraysTotal = Math.ceil(headcount / 10);

    const newSelections: Record<string, number> = {};

    if (isPureVeg) {
      newSelections['cat_p1'] = Math.ceil(starterTraysTotal * 0.6); // Paneer Tikka
      newSelections['cat_p3'] = Math.ceil(starterTraysTotal * 0.4); // Mushroom
      newSelections['cat_p5'] = Math.ceil(mainTraysTotal * 0.5); // Dal Makhani
      newSelections['cat_p6'] = Math.ceil(mainTraysTotal * 0.5); // Paneer Butter Masala
      newSelections['cat_p8'] = Math.ceil(mainTraysTotal * 0.4); // Veg Biryani
    } else if (isPureNonVeg) {
      newSelections['cat_p2'] = Math.ceil(starterTraysTotal * 0.6); // Malai Tikka
      newSelections['cat_p4'] = Math.ceil(starterTraysTotal * 0.4); // Mutton Seekh
      newSelections['cat_p5'] = Math.ceil(mainTraysTotal * 0.4); // Dal Makhani
      newSelections['cat_p7'] = Math.ceil(mainTraysTotal * 0.6); // Chicken Biryani
    } else if (dietRatio === '70_30') {
      newSelections['cat_p1'] = Math.ceil(starterTraysTotal * 0.5);
      newSelections['cat_p2'] = Math.ceil(starterTraysTotal * 0.3);
      newSelections['cat_p3'] = Math.ceil(starterTraysTotal * 0.2);
      newSelections['cat_p5'] = Math.ceil(mainTraysTotal * 0.4);
      newSelections['cat_p6'] = Math.ceil(mainTraysTotal * 0.3);
      newSelections['cat_p7'] = Math.ceil(mainTraysTotal * 0.3);
    } else {
      // 50/50 Balanced
      newSelections['cat_p1'] = Math.ceil(starterTraysTotal * 0.5);
      newSelections['cat_p2'] = Math.ceil(starterTraysTotal * 0.5);
      newSelections['cat_p5'] = Math.ceil(mainTraysTotal * 0.4);
      newSelections['cat_p7'] = Math.ceil(mainTraysTotal * 0.6);
    }

    newSelections['cat_p9'] = breadBasketsTotal; // Garlic Naan
    newSelections['cat_p13'] = dessertTraysTotal; // Matka Phirni

    setSelectedPlatters(newSelections);
    triggerToast(`✨ Auto-calculated platter quantities for ${headcount} guests!`);
  };

  // Quantity Modifier
  const handleUpdateQty = (id: string, delta: number) => {
    setSelectedPlatters((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      const copy = { ...prev };
      if (next === 0) {
        delete copy[id];
      } else {
        copy[id] = next;
      }
      return copy;
    });
  };

  // Calculate Subtotal & Total Weight
  const { subtotal, totalWeightKg, totalServingsCapacity, totalItemsCount } = useMemo(() => {
    let sub = 0;
    let weight = 0;
    let capacity = 0;
    let count = 0;

    Object.entries(selectedPlatters).forEach(([id, rawQty]) => {
      const qty = Number(rawQty) || 0;
      const item = CATERING_PLATTERS.find((p) => p.id === id);
      if (item && qty > 0) {
        sub += item.price * qty;
        weight += item.weightKg * qty;
        capacity += item.servesCount * qty;
        count += qty;
      }
    });

    return {
      subtotal: sub,
      totalWeightKg: Math.round(weight * 10) / 10,
      totalServingsCapacity: capacity,
      totalItemsCount: count,
    };
  }, [selectedPlatters]);

  // Bulk Discount Tier Computation
  const discountInfo = useMemo(() => {
    let pct = 0;
    let perkText = '';

    if (headcount >= 50 || subtotal >= 8000) {
      pct = 20;
      perkText = '🎉 20% OFF + FREE Live Clay-Oven Chef Setup & Dessert Tray';
    } else if (headcount >= 25 || subtotal >= 4000) {
      pct = 15;
      perkText = '🔥 15% OFF + FREE Chilled Badam Thandai Bucket';
    } else if (headcount >= 10 || subtotal >= 2000) {
      pct = 10;
      perkText = '✨ 10% OFF Bulk Catering Special';
    } else {
      pct = 5;
      perkText = '5% Base Party Discount';
    }

    const discountAmount = Math.round((subtotal * pct) / 100);
    const finalPrice = Math.max(0, subtotal - discountAmount);

    return {
      discountPct: pct,
      discountAmount,
      finalPrice,
      perkText,
    };
  }, [headcount, subtotal]);

  // Toast Trigger
  const triggerToast = (msg: string) => {
    setAddedToast(msg);
    setTimeout(() => {
      setAddedToast(null);
    }, 3000);
  };

  // Convert Catering Bundle to Cart Meal
  const handleAddBundleToCart = () => {
    if (totalItemsCount === 0) {
      alert('Please select at least 1 platter or tray to build your catering box!');
      return;
    }

    // Build itemized summary
    const platterDetails = Object.entries(selectedPlatters)
      .map(([id, qty]) => {
        const item = CATERING_PLATTERS.find((p) => p.id === id);
        return item ? `${qty}x ${item.name}` : null;
      })
      .filter(Boolean)
      .join(' • ');

    const cateringMeal: Meal = {
      id: `catering_bundle_${Date.now()}`,
      name: `🎉 TAASH CATERING BUNDLE (${headcount} Pax)`,
      description: `Custom Party Catering Box: ${platterDetails}. Total Weight: ~${totalWeightKg} KG. Discount Applied: ${discountInfo.discountPct}% OFF!`,
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
      price: discountInfo.finalPrice,
      isVeg: dietRatio === '100_veg',
      timings: ['lunch', 'dinner'],
      spicyLevel: 'medium',
      rating: 5.0,
      popularity: 100,
      prepTimeMinutes: 45,
    };

    onAddToCart(cateringMeal, 1);
    triggerToast(`🎉 Added ${headcount}-Pax Catering Bundle (₹${discountInfo.finalPrice}) to Cart!`);
    if (onOpenCart) {
      setTimeout(() => onOpenCart(), 600);
    }
  };

  // Submit Quote
  const handleQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteSubmitted(true);
    setTimeout(() => {
      setQuoteSubmitted(false);
      setShowQuoteModal(false);
      triggerToast('📞 Catering request sent! Our Event Concierge will call you in 15 mins.');
    }, 2000);
  };

  const filteredPlatters = useMemo(() => {
    if (activeCategory === 'all') return CATERING_PLATTERS;
    return CATERING_PLATTERS.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8 animate-fade-in pb-16">
      
      {/* FLOATING SUCCESS TOAST */}
      {addedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-brand-charcoal text-white text-xs font-bold shadow-2xl flex items-center gap-2.5 border border-brand-orange/40 animate-bounce">
          <Sparkles className="w-4 h-4 text-brand-orange" />
          <span>{addedToast}</span>
        </div>
      )}

      {/* HERO BANNER SECTION */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0D141C] via-[#161F28] to-[#0A0E13] text-white p-6 sm:p-10 overflow-hidden shadow-xl border border-white/10">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-orange/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-brand-green/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-orange/20 border border-brand-orange/40 text-brand-orange text-[11px] font-black uppercase tracking-wider">
              <PartyPopper className="w-3.5 h-3.5" /> TAASH BHATTI Party & Event Catering
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Host Unforgettable Parties with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-amber-100">
                Clay-Oven Tandoori Platters
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-2xl font-medium">
              Effortlessly plan house parties, corporate lunches, birthdays & weddings. Get automatic headcount portioning, custom combo trays, and instant tier bulk discounts!
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Hot Thermal Box Packing
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                <ChefHat className="w-4 h-4 text-brand-orange" />
                Live Tandoor Chef Available (50+ Pax)
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                <Percent className="w-4 h-4 text-amber-400" />
                Up to 20% Bulk Discount
              </div>
            </div>
          </div>

          <div className="md:col-span-4 flex justify-center">
            <div className="relative p-2 rounded-3xl bg-gradient-to-b from-amber-500/20 to-transparent border border-amber-500/30 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80"
                alt="Catering Platter"
                className="w-full h-48 sm:h-56 object-cover rounded-2xl shadow-md"
              />
              <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md p-3 rounded-xl border border-white/15 text-center">
                <span className="text-[10px] font-mono tracking-widest text-brand-orange uppercase block font-extrabold">
                  BULK DISCOUNT TIER ACTIVE
                </span>
                <span className="text-sm font-black text-white">Save Up to 20% + Free Perks</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: HEADCOUNT & EVENT CALCULATOR */}
      <div className="bg-white border border-brand-green/10 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-brand-green/10 pb-4">
          <div>
            <h2 className="text-lg font-black text-brand-charcoal flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-orange" />
              1. Guest Headcount & Event Settings
            </h2>
            <p className="text-xs text-brand-charcoal/60 mt-0.5">
              Specify your party details and let our algorithm suggest exact tray portions.
            </p>
          </div>

          <button
            onClick={applyRecommendedQuantities}
            className="px-4 py-2 bg-brand-orange/10 hover:bg-brand-orange/20 border border-brand-orange/30 text-brand-orange text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkle className="w-4 h-4 text-brand-orange" />
            Auto-Calculate Portions
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Guest Count Input & Slider */}
          <div className="space-y-3 bg-brand-cream/30 p-4 rounded-2xl border border-brand-green/5">
            <label className="text-xs font-black uppercase tracking-wider text-brand-charcoal flex items-center justify-between">
              <span>Expected Guest Count</span>
              <span className="text-sm font-black text-brand-orange bg-brand-orange/10 px-2.5 py-0.5 rounded-lg">
                {headcount} Guests
              </span>
            </label>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleHeadcountChange(headcount - 5)}
                className="w-10 h-10 rounded-xl bg-white border border-brand-green/15 text-brand-charcoal font-black flex items-center justify-center hover:bg-brand-cream transition-all shadow-xs cursor-pointer shrink-0"
              >
                -
              </button>
              
              <input
                type="range"
                min="5"
                max="150"
                step="5"
                value={headcount}
                onChange={(e) => handleHeadcountChange(parseInt(e.target.value))}
                className="w-full accent-brand-orange cursor-pointer"
              />

              <button
                onClick={() => handleHeadcountChange(headcount + 5)}
                className="w-10 h-10 rounded-xl bg-white border border-brand-green/15 text-brand-charcoal font-black flex items-center justify-center hover:bg-brand-cream transition-all shadow-xs cursor-pointer shrink-0"
              >
                +
              </button>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[10, 25, 50, 100].map((num) => (
                <button
                  key={num}
                  onClick={() => setHeadcount(num)}
                  className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                    headcount === num
                      ? 'bg-brand-orange text-white border-brand-orange'
                      : 'bg-white text-brand-charcoal/70 border-brand-green/10 hover:border-brand-orange/30'
                  }`}
                >
                  {num} Pax
                </button>
              ))}
            </div>
          </div>

          {/* Event Occasion */}
          <div className="space-y-3 bg-brand-cream/30 p-4 rounded-2xl border border-brand-green/5">
            <label className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
              Event Occasion
            </label>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'house_party', label: 'House Party', icon: Home },
                { id: 'office_lunch', label: 'Office Lunch', icon: Building },
                { id: 'birthday', label: 'Birthday', icon: Cake },
                { id: 'rooftop_bbq', label: 'Rooftop BBQ', icon: Flame },
              ].map((ev) => {
                const IconComponent = ev.icon;
                const isSelected = eventType === ev.id;
                return (
                  <button
                    key={ev.id}
                    onClick={() => setEventType(ev.id as any)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-brand-green text-white border-brand-green shadow-xs'
                        : 'bg-white text-brand-charcoal border-brand-green/10 hover:bg-brand-cream'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-brand-orange'}`} />
                    <span className="text-xs font-bold">{ev.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Diet Preferences Ratio */}
          <div className="space-y-3 bg-brand-cream/30 p-4 rounded-2xl border border-brand-green/5">
            <label className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
              Dietary Ratio Preference
            </label>

            <div className="space-y-2">
              {[
                { id: '50_50', label: '50% Veg / 50% Non-Veg' },
                { id: '70_30', label: '70% Veg / 30% Non-Veg' },
                { id: '100_veg', label: '100% Pure Vegetarian' },
                { id: '100_nonveg', label: '100% Non-Vegetarian' },
              ].map((dt) => (
                <button
                  key={dt.id}
                  onClick={() => setDietRatio(dt.id as any)}
                  className={`w-full py-2 px-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                    dietRatio === dt.id
                      ? 'bg-brand-charcoal text-white border-brand-charcoal'
                      : 'bg-white text-brand-charcoal border-brand-green/10 hover:bg-brand-cream'
                  }`}
                >
                  <span>{dt.label}</span>
                  {dietRatio === dt.id && <Check className="w-3.5 h-3.5 text-brand-orange" />}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Portion Specs Bar */}
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 p-4 rounded-2xl border border-amber-500/20 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-brand-charcoal">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-brand-orange shrink-0" />
            <span>
              Portion Specs for <strong>{headcount} Guests</strong>: Est. ~<strong>{(headcount * 0.35).toFixed(1)} KG Total Food</strong> (~350g per head)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="bg-white px-3 py-1 rounded-lg border border-brand-green/10 font-bold text-brand-green">
              Capacity: {totalServingsCapacity} Pax
            </span>
            <span className={`px-3 py-1 rounded-lg font-bold ${totalServingsCapacity >= headcount ? 'bg-emerald-500/20 text-emerald-800' : 'bg-amber-500/20 text-amber-800'}`}>
              {totalServingsCapacity >= headcount ? '✓ Portions Sufficient' : '⚠️ Add more trays'}
            </span>
          </div>
        </div>

      </div>

      {/* SECTION 2: CUSTOM PLATTER COMBO BUILDER */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-brand-green/10 shadow-xs">
          <div>
            <h2 className="text-lg font-black text-brand-charcoal flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-brand-orange" />
              2. Custom Box & Platter Combo Builder
            </h2>
            <p className="text-xs text-brand-charcoal/60 mt-0.5">
              Select party trays, starters, handi biryanis, and dessert buckets.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Trays' },
              { id: 'starter', label: 'Starters' },
              { id: 'main', label: 'Mains & Biryani' },
              { id: 'bread_rice', label: 'Breads & Rice' },
              { id: 'dessert_drink', label: 'Desserts & Drinks' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-brand-green text-white shadow-xs'
                    : 'bg-brand-cream/60 text-brand-charcoal/70 hover:bg-brand-cream'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Platter Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlatters.map((item) => {
            const qty = selectedPlatters[item.id] || 0;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-4 transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                  qty > 0
                    ? 'border-brand-green shadow-md ring-1 ring-brand-green/20'
                    : 'border-brand-green/10 hover:border-brand-orange/30 shadow-xs'
                }`}
              >
                {item.popular && (
                  <span className="absolute top-3 right-3 bg-brand-orange text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow-xs z-10">
                    🔥 Party Bestseller
                  </span>
                )}

                <div className="flex gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 rounded-xl object-cover shrink-0 border border-brand-green/10"
                  />
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className="text-[10px] font-black uppercase text-brand-charcoal/50">
                        {item.isVeg ? 'Pure Veg' : 'Non-Veg'} • Serves {item.servesCount} Pax
                      </span>
                    </div>

                    <h3 className="font-extrabold text-xs text-brand-charcoal leading-snug line-clamp-2">
                      {item.name}
                    </h3>

                    <p className="text-[10px] text-brand-charcoal/60 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-brand-green/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-brand-charcoal/50 font-medium block">Price per Tray</span>
                    <span className="text-sm font-black text-brand-green">₹{item.price}</span>
                    <span className="text-[10px] text-brand-orange font-bold block">
                      (~{item.weightKg} KG)
                    </span>
                  </div>

                  {/* Quantity Selector */}
                  <div className="flex items-center gap-2">
                    {qty > 0 ? (
                      <div className="flex items-center gap-2 bg-brand-green text-white rounded-xl p-1 shadow-xs">
                        <button
                          onClick={() => handleUpdateQty(item.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white font-black flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-black text-xs px-1">{qty}</span>
                        <button
                          onClick={() => handleUpdateQty(item.id, 1)}
                          className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white font-black flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpdateQty(item.id, 1)}
                        className="px-3.5 py-2 rounded-xl bg-brand-cream border border-brand-green/20 text-brand-green hover:bg-brand-green hover:text-white font-extrabold text-xs transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Tray
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: STICKY BULK DISCOUNT SUMMARY & CHECKOUT BAR */}
      <div className="bg-brand-charcoal text-white rounded-3xl p-6 shadow-xl border border-white/10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange/20 text-brand-orange text-[10px] font-black uppercase tracking-wider mb-1">
              <Gift className="w-3.5 h-3.5" /> {discountInfo.perkText}
            </div>
            <h2 className="text-xl font-black text-white">
              Catering Box Order Summary
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowQuoteModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-brand-orange" /> Request Custom Live-Chef Quote
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase">Selected Trays</span>
            <span className="text-lg font-black text-white">{totalItemsCount} Trays</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase">Capacity</span>
            <span className="text-lg font-black text-emerald-400">{totalServingsCapacity} Pax</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase">Total Weight</span>
            <span className="text-lg font-black text-amber-300">~{totalWeightKg} KG</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase">Bulk Discount</span>
            <span className="text-lg font-black text-brand-orange">-{discountInfo.discountPct}% OFF</span>
          </div>
        </div>

        {/* Selected Items Breakdown List */}
        {totalItemsCount > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
            {Object.entries(selectedPlatters).map(([id, rawQty]) => {
              const qty = Number(rawQty) || 0;
              const item = CATERING_PLATTERS.find((p) => p.id === id);
              if (!item || qty === 0) return null;
              return (
                <div key={id} className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                  <span className="text-gray-300 font-medium">
                    {qty}x {item.name}
                  </span>
                  <span className="font-extrabold text-amber-300">₹{item.price * qty}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-gray-400 font-medium border border-dashed border-white/10 rounded-xl">
            No platters selected yet. Click "+ Add Tray" above to customize your party bundle!
          </div>
        )}

        {/* Pricing Totals */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">₹{discountInfo.finalPrice}</span>
              {discountInfo.discountAmount > 0 && (
                <span className="text-sm font-bold text-gray-400 line-through">₹{subtotal}</span>
              )}
            </div>
            <p className="text-[11px] text-emerald-400 font-bold">
              🎉 You Save ₹{discountInfo.discountAmount} with {discountInfo.discountPct}% Bulk Tier Discount!
            </p>
          </div>

          <button
            onClick={handleAddBundleToCart}
            disabled={totalItemsCount === 0}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-brand-orange via-amber-500 to-brand-orange text-white font-black text-sm rounded-2xl shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-5 h-5" />
            Add Party Bundle to Cart (₹{discountInfo.finalPrice})
          </button>
        </div>
      </div>

      {/* CUSTOM QUOTE MODAL */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-brand-green/20 overflow-hidden animate-fade-in">
            
            <div className="bg-brand-charcoal text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-brand-orange" /> Request Custom Live-Bhatti Quote
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Live Clay-Oven Chef setup at your venue with custom menu preferences.
                </p>
              </div>

              <button
                onClick={() => setShowQuoteModal(false)}
                className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {quoteSubmitted ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-xl font-black text-brand-charcoal">Catering Request Received!</h4>
                <p className="text-xs text-brand-charcoal/70 leading-relaxed max-w-xs mx-auto">
                  Our Senior Executive Chef & Event Manager will contact you within 15 minutes at{' '}
                  <strong>{quoteForm.phone}</strong> to confirm venue setup & tasting details.
                </p>
              </div>
            ) : (
              <form onSubmit={handleQuoteSubmit} className="p-6 space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-brand-charcoal/60 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anish Verma"
                      value={quoteForm.name}
                      onChange={(e) => setQuoteForm({ ...quoteForm, name: e.target.value })}
                      className="w-full bg-brand-cream/30 border border-brand-green/15 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-brand-charcoal/60 block mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={quoteForm.phone}
                      onChange={(e) => setQuoteForm({ ...quoteForm, phone: e.target.value })}
                      className="w-full bg-brand-cream/30 border border-brand-green/15 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-brand-charcoal/60 block mb-1">
                      Event Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={quoteForm.eventDate}
                      onChange={(e) => setQuoteForm({ ...quoteForm, eventDate: e.target.value })}
                      className="w-full bg-brand-cream/30 border border-brand-green/15 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-brand-charcoal/60 block mb-1">
                      Event Time
                    </label>
                    <input
                      type="time"
                      value={quoteForm.eventTime}
                      onChange={(e) => setQuoteForm({ ...quoteForm, eventTime: e.target.value })}
                      className="w-full bg-brand-cream/30 border border-brand-green/15 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-brand-charcoal/60 block mb-1">
                    Venue Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Villa 14, Royal Palm Residency, Muzaffarpur"
                    value={quoteForm.venueAddress}
                    onChange={(e) => setQuoteForm({ ...quoteForm, venueAddress: e.target.value })}
                    className="w-full bg-brand-cream/30 border border-brand-green/15 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-brand-orange/10 border border-brand-orange/20 rounded-xl">
                  <input
                    type="checkbox"
                    id="needLiveChef"
                    checked={quoteForm.needLiveChef}
                    onChange={(e) => setQuoteForm({ ...quoteForm, needLiveChef: e.target.checked })}
                    className="w-4 h-4 accent-brand-orange cursor-pointer"
                  />
                  <label htmlFor="needLiveChef" className="text-xs font-bold text-brand-charcoal cursor-pointer">
                    Request On-Site Portable Clay-Oven & Live Bhatti Chef (+₹2,500 setup charge)
                  </label>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-brand-charcoal/60 block mb-1">
                    Special Menu Instructions / Requests
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Need mild spicy tikkas for kids, extra mint chutney tubs..."
                    value={quoteForm.specialRequests}
                    onChange={(e) => setQuoteForm({ ...quoteForm, specialRequests: e.target.value })}
                    className="w-full bg-brand-cream/30 border border-brand-green/15 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-brand-green hover:bg-brand-green/95 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Send Catering Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
