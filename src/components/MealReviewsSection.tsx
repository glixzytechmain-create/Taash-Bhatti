/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, CheckCircle, Sparkles, User as UserIcon, ChefHat } from 'lucide-react';
import { Meal, MealReview, User } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface MealReviewsSectionProps {
  meal: Meal;
  currentUser?: User;
  onUpdateMealRating?: (mealId: string, newRating: number, newCount: number) => void;
}

export default function MealReviewsSection({ meal, currentUser, onUpdateMealRating }: MealReviewsSectionProps) {
  const [reviews, setReviews] = useState<MealReview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch real reviews from Firestore for this specific meal
  useEffect(() => {
    if (!meal?.id) return;
    setLoading(true);

    try {
      const reviewsRef = collection(db, 'meal_reviews');
      const q = query(reviewsRef, where('mealId', '==', meal.id));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loaded: MealReview[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as MealReview);
        });

        // Sort latest first
        loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setReviews(loaded);
        setLoading(false);

        // Compute updated average rating if any verified reviews exist
        if (loaded.length > 0 && onUpdateMealRating) {
          const sum = loaded.reduce((acc, r) => acc + (r.rating || 5), 0);
          const avg = Number((sum / loaded.length).toFixed(1));
          onUpdateMealRating(meal.id, avg, loaded.length);
        }
      }, (err) => {
        console.warn("Could not subscribe to meal_reviews:", err);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore reviews query error:", e);
      setLoading(false);
    }
  }, [meal.id]);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : (meal.rating && meal.reviewsCount && meal.reviewsCount > 0 ? meal.rating.toFixed(1) : null);

  const totalReviewsCount = reviews.length > 0
    ? reviews.length
    : (meal.reviewsCount || 0);

  return (
    <div className="bg-brand-cream/35 border border-brand-green/15 rounded-3xl p-4.5 space-y-4 text-left">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-green" />
          <h4 className="text-xs font-black uppercase text-brand-charcoal tracking-wider">
            Verified Customer Reviews
          </h4>
        </div>

        <span className="text-[10px] font-bold text-brand-charcoal/50 bg-white/80 border border-brand-green/10 px-2.5 py-1 rounded-xl">
          Read-Only Diners Log
        </span>
      </div>

      {/* Average Rating Score Card (Only rendered when real reviews exist) */}
      {averageRating && totalReviewsCount > 0 ? (
        <div className="p-3.5 bg-white rounded-2xl border border-brand-green/10 flex items-center justify-between gap-3 flex-wrap shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col items-center justify-center shrink-0">
              <span className="text-base font-black text-brand-charcoal leading-none">{averageRating}</span>
              <div className="flex text-amber-500 mt-0.5">
                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const numAvg = parseFloat(averageRating);
                  return (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= Math.round(numAvg)
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-gray-300'
                      }`}
                    />
                  );
                })}
              </div>
              <p className="text-[10px] text-brand-charcoal/60 font-semibold mt-0.5">
                Based on <strong className="text-brand-charcoal font-black">{totalReviewsCount}</strong> verified diner {totalReviewsCount === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          </div>

          <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-xl flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            Delivered Orders Only
          </div>
        </div>
      ) : null}

      {/* Reviews Feed */}
      {loading ? (
        <div className="py-3 text-center text-xs text-gray-400 font-mono">
          Checking verified diner feedback...
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-4 bg-white/80 rounded-2xl border border-dashed border-brand-green/20 text-center space-y-1.5">
          <ChefHat className="w-7 h-7 text-brand-green/30 mx-auto" />
          <p className="text-xs font-bold text-brand-charcoal">
            No reviews yet for this dish.
          </p>
          <p className="text-[10px] text-brand-charcoal/60 max-w-sm mx-auto leading-relaxed">
            Reviews are exclusive to verified diners. Customers who order this dish can rate and review it right after delivery or from their <strong className="text-brand-green">Order History</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-3 bg-white rounded-2xl border border-brand-green/10 space-y-1.5 shadow-3xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-brand-green/10 text-brand-green flex items-center justify-center font-bold text-[10px]">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-brand-charcoal block leading-none">
                      {rev.userName || 'Gourmet Patron'}
                    </span>
                    <span className="text-[8px] text-brand-charcoal/40 font-mono">
                      {new Date(rev.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span className="text-[10px] font-black text-amber-700">{rev.rating}/5</span>
                </div>
              </div>

              {/* Tags */}
              {rev.tags && rev.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {rev.tags.map((t, ti) => (
                    <span
                      key={ti}
                      className="text-[9px] font-bold bg-brand-green/5 text-brand-green px-2 py-0.5 rounded-md border border-brand-green/10"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Comment text */}
              {rev.reviewText && (
                <p className="text-[11px] text-brand-charcoal/80 font-medium leading-relaxed italic">
                  "{rev.reviewText}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
