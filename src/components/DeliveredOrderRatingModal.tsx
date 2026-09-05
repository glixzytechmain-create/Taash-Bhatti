/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X, CheckCircle, Truck, Utensils, MessageSquare, Sparkles, Send, ShieldCheck } from 'lucide-react';
import { Order, User, MealReview } from '../types';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';

interface DeliveredOrderRatingModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User;
  onRatingSubmitted: (orderId: string, rating: number, tags: string[], feedback: string, dishReviews?: MealReview[]) => void;
}

export default function DeliveredOrderRatingModal({
  order,
  isOpen,
  onClose,
  currentUser,
  onRatingSubmitted,
}: DeliveredOrderRatingModalProps) {
  const [overallRating, setOverallRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    '🔥 Scalding Hot',
    '✨ Gourmet Quality',
  ]);
  const [overallFeedback, setOverallFeedback] = useState<string>('');

  // Per-dish ratings and reviews state
  const [dishRatings, setDishRatings] = useState<Record<string, { rating: number; reviewText: string }>>(() => {
    const initial: Record<string, { rating: number; reviewText: string }> = {};
    order.items.forEach((item) => {
      if (item.meal?.id) {
        initial[item.meal.id] = { rating: 5, reviewText: '' };
      }
    });
    return initial;
  });

  const [dishHoverRating, setDishHoverRating] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'delivery' | 'dishes'>('delivery');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const TAGS_LIST = [
    '🔥 Scalding Hot',
    '✨ Gourmet Quality',
    '🛵 Superfast Rider',
    '📦 Perfect Packaging',
    '🌿 Fresh Ingredients',
    '👅 Authentic Spices',
    '💯 Spotless Hygiene',
    '😊 Polite Delivery',
  ];

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSetDishRating = (mealId: string, rating: number) => {
    setDishRatings((prev) => ({
      ...prev,
      [mealId]: {
        ...(prev[mealId] || { reviewText: '' }),
        rating,
      },
    }));
  };

  const handleSetDishReviewText = (mealId: string, reviewText: string) => {
    setDishRatings((prev) => ({
      ...prev,
      [mealId]: {
        ...(prev[mealId] || { rating: 5 }),
        reviewText,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    const ratedAtTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Prepare dish reviews
    const generatedDishReviews: MealReview[] = [];
    for (const item of order.items) {
      if (!item.meal?.id) continue;
      const dInfo = dishRatings[item.meal.id];
      const dRating = dInfo ? dInfo.rating : overallRating;
      const dText = dInfo ? dInfo.reviewText.trim() : '';

      const dishRev: MealReview = {
        id: `DREV-${order.id}-${item.meal.id}-${Date.now()}`,
        mealId: item.meal.id,
        mealName: item.meal.name,
        orderId: order.id,
        userId: currentUser?.id || order.userId || 'guest',
        userName: currentUser?.name || 'Gourmet Foodie',
        userEmail: currentUser?.email || undefined,
        rating: dRating,
        reviewText: dText || (overallFeedback.trim() ? overallFeedback.trim() : undefined),
        tags: selectedTags,
        createdAt: new Date().toISOString(),
        verifiedOrder: true,
      };

      generatedDishReviews.push(dishRev);

      // Save each dish review to Firestore
      try {
        await setDoc(doc(db, 'meal_reviews', dishRev.id), sanitizeForFirestore(dishRev));
      } catch (err) {
        console.warn("Could not save meal_review to firestore:", err);
      }
    }

    // 2. Call callback to update parent state, order rating, and support ticketing
    onRatingSubmitted(order.id, overallRating, selectedTags, overallFeedback, generatedDishReviews);

    setSubmitted(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
    }, 1400);
  };

  if (!isOpen) return null;

  const riderName = order.deliveryPartnerName || (order as any).assignedRiderName;
  const riderVehicle = order.deliveryPartnerVehicle || (order as any).assignedRiderVehicle || 'Motorbike';
  const vehicleNumber = order.deliveryVehicleNumber || (order as any).assignedRiderVehicleNumber;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-brand-charcoal/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-brand-green/20 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-[#12181F] via-[#1A232C] to-[#12181F] text-white p-5 relative border-b border-brand-green/20">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-amber-400 text-[10px] font-black uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Delivered Order Review</span>
            </div>

            <h3 className="text-lg font-black text-white leading-tight">
              Rate Your Taash Bhatti Experience
            </h3>

            <p className="text-xs text-gray-300 mt-1 font-mono">
              Order #{order.id} • {order.items.length} {order.items.length === 1 ? 'Dish' : 'Dishes'}
            </p>
          </div>

          {/* Tab Switcher: Delivery & Overall vs Individual Dishes */}
          <div className="flex border-b border-gray-100 bg-gray-50/80 px-4 pt-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('delivery')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase border-b-2 transition-all cursor-pointer ${
                activeTab === 'delivery'
                  ? 'border-brand-green text-brand-green bg-white rounded-t-xl shadow-xs'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              1. Delivery & Service
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dishes')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase border-b-2 transition-all cursor-pointer ${
                activeTab === 'dishes'
                  ? 'border-brand-green text-brand-green bg-white rounded-t-xl shadow-xs'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              2. Rate Dishes ({order.items.length})
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-4">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center space-y-3"
              >
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h4 className="text-base font-black text-brand-charcoal">
                  Thank You for Rating!
                </h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                  Your feedback and dish reviews help our kitchen master chefs and delivery partners maintain world-class tandoori quality.
                </p>
              </motion.div>
            ) : activeTab === 'delivery' ? (
              <div className="space-y-4">
                {/* Rider Info Card if present */}
                {riderName && (
                  <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-black font-black flex items-center justify-center text-sm shadow-xs">
                        🛵
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-900 font-bold uppercase block">
                          Delivered by Rider
                        </span>
                        <span className="text-xs font-black text-brand-charcoal">
                          {riderName} {vehicleNumber ? `(${vehicleNumber})` : ''}
                        </span>
                        <span className="text-[10px] text-gray-500 block font-mono">
                          {riderVehicle}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-mono bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300 uppercase">
                        Fulfilled
                      </span>
                    </div>
                  </div>
                )}

                {/* Overall 5 Star Rating */}
                <div className="text-center py-2 bg-brand-cream/50 rounded-2xl border border-brand-green/15 p-4">
                  <label className="text-xs font-black uppercase text-brand-charcoal tracking-wider block mb-2">
                    How was your overall order experience?
                  </label>

                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setOverallRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 hover:scale-125 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= (hoverRating || overallRating)
                              ? 'text-amber-500 fill-amber-500 drop-shadow-md'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <p className="text-xs font-black text-amber-600 mt-2">
                    {overallRating === 5 ? '🌟 Exceptional! Scalding hot & delicious' :
                     overallRating === 4 ? '✨ Great food & timely delivery' :
                     overallRating === 3 ? '👌 Decent / Average' :
                     overallRating === 2 ? '⚠️ Could be better' : '❌ Disappointed'}
                  </p>
                </div>

                {/* Quick Feedback Tags */}
                <div>
                  <label className="text-[10px] font-black uppercase text-brand-charcoal/70 tracking-wider block mb-2">
                    What stood out the most? (Tap to select)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {TAGS_LIST.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-brand-green text-white border-brand-green shadow-xs'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Feedback Notes */}
                <div>
                  <label className="text-[10px] font-black uppercase text-brand-charcoal/70 tracking-wider block mb-1">
                    Optional Review Note for Kitchen & Delivery Team
                  </label>
                  <textarea
                    rows={3}
                    value={overallFeedback}
                    onChange={(e) => setOverallFeedback(e.target.value)}
                    placeholder="Tell us about the spice balance, thermal pouch warmth, or rider politeness..."
                    className="w-full text-xs p-3 rounded-2xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-green/30 resize-none font-medium text-brand-charcoal"
                  />
                </div>
              </div>
            ) : (
              /* Per-Dish Rating Section */
              <div className="space-y-4">
                <div className="p-3 bg-brand-green/5 border border-brand-green/15 rounded-2xl flex items-center gap-2 text-[11px] text-brand-charcoal">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    Your dish reviews will appear directly on each meal's menu card for other food lovers!
                  </span>
                </div>

                {order.items.map((item, idx) => {
                  if (!item.meal?.id) return null;
                  const curRating = dishRatings[item.meal.id]?.rating || 5;
                  const curReviewText = dishRatings[item.meal.id]?.reviewText || '';
                  const curHover = dishHoverRating[item.meal.id] || 0;

                  return (
                    <div
                      key={item.meal.id || idx}
                      className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.meal.image}
                            alt={item.meal.name}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <h4 className="text-xs font-black text-brand-charcoal leading-snug">
                              {item.quantity}x {item.meal.name}
                            </h4>
                            <span className="text-[10px] text-gray-500 font-mono">
                              ₹{item.meal.price}
                            </span>
                          </div>
                        </div>

                        {/* Dish star selector */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleSetDishRating(item.meal.id, star)}
                              onMouseEnter={() => setDishHoverRating((prev) => ({ ...prev, [item.meal.id]: star }))}
                              onMouseLeave={() => setDishHoverRating((prev) => ({ ...prev, [item.meal.id]: 0 }))}
                              className="p-0.5 hover:scale-125 transition-transform cursor-pointer"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  star <= (curHover || curRating)
                                    ? 'text-amber-500 fill-amber-500'
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <input
                        type="text"
                        value={curReviewText}
                        onChange={(e) => handleSetDishReviewText(item.meal.id, e.target.value)}
                        placeholder={`Tasting note for ${item.meal.name.split(' ')[0]}...`}
                        className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-green/30 font-medium"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          {!submitted && (
            <div className="p-4 bg-gray-50 border-t border-gray-200 shrink-0 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
              >
                Skip / Later
              </button>

              <div className="flex items-center gap-2">
                {activeTab === 'delivery' && order.items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('dishes')}
                    className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-brand-charcoal font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  >
                    Next: Rate Dishes ➜
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Saving Review...' : 'Submit Rating & Review'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
