/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Utensils,
  Plus,
  RefreshCw,
  Eye,
  ChefHat,
  Award,
} from 'lucide-react';
import { Meal } from '../types';
import { MEALS_DATA } from '../data';

interface AICoachTabProps {
  onAddToCart: (meal: Meal) => void;
  selectedGym?: any;
  onQuickView: (meal: Meal) => void;
  meals?: Meal[];
}

export default function AICoachTab({
  onAddToCart,
  onQuickView,
  meals = MEALS_DATA,
}: AICoachTabProps) {
  // Input states
  const [flavorProfile, setFlavorProfile] = useState<string>('spicy');
  const [diet, setDiet] = useState<'all' | 'veg'>('all');
  const [mealTime, setMealTime] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [budget, setBudget] = useState<number>(500);

  // UI Flow States
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [recommendations, setRecommendations] = useState<{
    meals: string[];
    coachTip: string;
    summary: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startLoadingAnimation = () => {
    setLoading(true);
    setLoadingStep(0);
    setError(null);

    const step1 = setTimeout(() => setLoadingStep(1), 1000);
    const step2 = setTimeout(() => setLoadingStep(2), 2000);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
    };
  };

  const handleGetSuggestions = async () => {
    startLoadingAnimation();

    try {
      const response = await fetch('/api/gemini/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flavorProfile,
          budget,
          isVeg: diet === 'veg',
          mealTime,
        }),
      });

      if (!response.ok) {
        throw new Error('Server returned an error');
      }

      const data = await response.json();
      setRecommendations({
        meals: data.meals || [],
        coachTip: data.coachTip || 'Enjoy our fresh chef-crafted creations!',
        summary: data.summary || '',
      });
    } catch (err) {
      console.error(err);
      setError('Running in local offline chef fallback.');
      
      // Local Heuristic Fallback
      const fallbackMeals = meals.filter((m) => {
        if (diet === 'veg' && !m.isVeg) return false;
        if (m.isHidden) return false;
        return true;
      }).slice(0, 2);

      setRecommendations({
        meals: fallbackMeals.map(m => m.id),
        coachTip: `👋 Welcome to TAASH BHATTI! For your **${mealTime}** dining preference, our executive chef recommends these signature dishes cooked fresh with daily organic farm ingredients.`,
        summary: `Chef's Choice: ${fallbackMeals.map(m => m.name).join(' & ')}.`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRecommendations(null);
    setError(null);
  };

  const recommendedMealsObj = useMemo(() => {
    if (!recommendations || !recommendations.meals) return [];
    return meals.filter((m) => (recommendations.meals || []).includes(m.id));
  }, [recommendations, meals]);

  const loadingTexts = [
    'Consulting TAASH BHATTI Executive Chef...',
    'Matching flavor profiles and spices...',
    'Checking kitchen inventory & fresh farm arrivals...',
  ];

  return (
    <div className="pb-24 max-w-6xl mx-auto px-4 pt-4">
      {/* HEADER HERO */}
      <div className="bg-linear-to-r from-brand-orange to-amber-500 rounded-3xl p-5 text-white shadow-md relative overflow-hidden mb-5">
        <div className="absolute right-[-10px] top-[-10px] text-white/10">
          <ChefHat className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <span className="bg-white/20 text-white font-extrabold text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-3 h-3 text-brand-orange fill-brand-orange animate-spin" /> TAASH BHATTI AI Chef
          </span>
          <h2 className="text-xl font-black tracking-tight leading-tight">AI Culinary Advisor</h2>
          <p className="text-xs text-white/95 mt-1">
            Curate your ideal gourmet meal recommendation based on flavor profiles, fresh ingredients, and dietary choices.
          </p>
        </div>
      </div>

      {/* FLOW CONTROLLER */}
      {!loading && !recommendations && (
        <div className="bg-white border border-brand-green/10 rounded-3xl p-5 space-y-4 shadow-3xs">
          <h3 className="text-xs font-extrabold text-brand-green uppercase tracking-wider border-b border-brand-green/5 pb-2">
            Configure Your Taste Preferences
          </h3>

          {/* Flavor Profile Selector */}
          <div>
            <label className="text-[11px] font-extrabold text-brand-charcoal/60 block mb-1.5 uppercase tracking-wide">
              Flavor & Mood Preference
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'spicy', label: '🔥 Spicy & Bold' },
                { id: 'savory', label: '🍗 Rich & Savory' },
                { id: 'fresh', label: '🥗 Fresh & Light' },
                { id: 'gourmet', label: '⭐ Chef Special' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFlavorProfile(f.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-left cursor-pointer ${
                    flavorProfile === f.id
                      ? 'bg-brand-green text-white border-brand-green shadow-xs'
                      : 'bg-brand-cream/10 text-brand-charcoal border-brand-green/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Diet Preferences */}
          <div>
            <label className="text-[11px] font-extrabold text-brand-charcoal/60 block mb-1.5 uppercase tracking-wide">
              Diet Preference
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'all', label: 'All (Veg & Non-Veg)' },
                { id: 'veg', label: '🌿 Pure Vegetarian' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDiet(d.id as any)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-left cursor-pointer ${
                    diet === d.id
                      ? 'bg-brand-green text-white border-brand-green shadow-xs'
                      : 'bg-brand-cream/10 text-brand-charcoal border-brand-green/10'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meal timing selection */}
          <div>
            <label className="text-[11px] font-extrabold text-brand-charcoal/60 block mb-1.5 uppercase tracking-wide">
              Meal Timing
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'breakfast', label: 'Breakfast' },
                { id: 'lunch', label: 'Lunch' },
                { id: 'dinner', label: 'Dinner' },
                { id: 'snack', label: 'Snack' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setMealTime(t.id as any)}
                  className={`py-2 px-1 rounded-xl text-[10px] text-center font-bold border transition-all cursor-pointer ${
                    mealTime === t.id
                      ? 'bg-brand-orange text-brand-charcoal border-brand-orange'
                      : 'bg-brand-cream/10 text-brand-charcoal border-brand-green/10'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Budget Slider */}
          <div>
            <div className="flex justify-between items-center text-[11px] font-extrabold text-brand-charcoal/60 mb-1">
              <span className="uppercase tracking-wide">Budget Limit</span>
              <span className="text-brand-orange font-black">Max ₹{budget}</span>
            </div>
            <input
              type="range"
              min="200"
              max="1000"
              step="50"
              value={budget}
              onChange={(e) => setBudget(parseInt(e.target.value))}
              className="w-full accent-brand-orange bg-brand-orange/10 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* CTA BUILD TRIGGER */}
          <button
            id="ai-chef-submit-btn"
            onClick={handleGetSuggestions}
            className="w-full bg-brand-green hover:bg-brand-green/95 text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-brand-orange animate-pulse" />
            RECOMMEND CHEF CREATIONS
          </button>
        </div>
      )}

      {/* LOADING ANIMATION SKELETON */}
      {loading && (
        <div className="bg-white border border-brand-green/10 rounded-3xl p-8 text-center space-y-4 shadow-3xs">
          <div className="w-16 h-16 rounded-full border-4 border-dashed border-brand-orange animate-spin mx-auto flex items-center justify-center text-brand-orange">
            <ChefHat className="w-7 h-7" />
          </div>

          <h3 className="font-extrabold text-sm text-brand-charcoal animate-pulse">
            {loadingTexts[loadingStep]}
          </h3>
          <p className="text-[10px] text-brand-charcoal/50 max-w-xs mx-auto">
            Our AI Master Chef is selecting fresh recipes that match your dining preference and kitchen availability.
          </p>

          <div className="pt-4 space-y-2.5 max-w-xs mx-auto">
            <div className="h-6 w-full bg-brand-cream/40 rounded-xl animate-pulse shimmer" />
            <div className="h-20 w-full bg-brand-cream/40 rounded-xl animate-pulse shimmer" />
          </div>
        </div>
      )}

      {/* RESULTS DISPLAY SCREEN */}
      {!loading && recommendations && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-fade-in">
          {/* COLUMN 1: CHEF ADVICE */}
          <div className="space-y-4">
            <div className="bg-white border border-brand-green/10 rounded-3xl p-5 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 bg-brand-orange/10 rounded-bl-2xl text-brand-orange">
                <Award className="w-5 h-5" />
              </div>

              <h3 className="font-extrabold text-xs text-brand-green uppercase tracking-wider mb-2.5">
                Chef's Recommendation & Pairing
              </h3>

              <p className="text-xs text-brand-charcoal/80 leading-relaxed font-medium">
                {recommendations.coachTip}
              </p>

              {recommendations.summary && (
                <div className="mt-3.5 pt-3.5 border-t border-brand-green/5 text-[10px] font-bold text-brand-charcoal/60 flex items-center gap-1.5 bg-brand-orange/5 p-2 rounded-xl">
                  <Utensils className="w-4 h-4 text-brand-orange" />
                  <span>{recommendations.summary}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleReset}
              className="w-full bg-brand-cream/50 hover:bg-brand-cream border border-brand-green/15 text-brand-green font-bold text-xs py-3 rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Recommend Other Creations
            </button>
          </div>

          {/* COLUMN 2: RECOMMENDED MEALS LIST */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-brand-green uppercase tracking-wider">
              Selected Creations For You
            </h3>

            <div className="space-y-3">
              {(recommendedMealsObj || []).map((meal, mealIdx) => (
                <div
                  key={`coach-meal-${meal.id || mealIdx}-${mealIdx}`}
                  className="bg-white rounded-2xl border border-brand-green/10 p-3 flex gap-3 shadow-3xs hover:shadow-xs transition-all justify-between"
                >
                  <div className="flex gap-3">
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative">
                      <img
                        src={meal.image}
                        alt={meal.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {meal.rating && meal.rating > 0 ? (
                        <div className="absolute top-1 left-1 bg-brand-charcoal/90 text-white font-bold text-[8px] px-1.5 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                          ★ {meal.rating.toFixed(1)}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col justify-between py-0.5">
                      <div>
                        <h4 className="font-bold text-xs text-brand-charcoal leading-snug line-clamp-1">
                          {meal.name}
                        </h4>
                        <p className="text-[10px] text-brand-charcoal/50 leading-tight mt-0.5 line-clamp-1">
                          {meal.description}
                        </p>
                      </div>

                      <div className="flex gap-2 text-[9px] font-bold text-brand-green bg-brand-green/5 p-1 rounded-md max-w-max">
                        <span>⏱️ {meal.prepTimeMinutes || 20} mins prep</span>
                        <span>{meal.isVeg ? '🌿 Veg' : '🍗 Non-Veg'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between items-end shrink-0 pl-1">
                    <span className="text-xs font-black text-brand-charcoal">₹{meal.price}</span>
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => onQuickView(meal)}
                        className="p-1 rounded-lg border border-brand-green/10 text-brand-green hover:bg-brand-green/5 transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onAddToCart(meal)}
                        className="bg-brand-green text-white font-black text-[9px] px-2.5 py-1.5 rounded-lg hover:bg-brand-green/90 transition-all flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple useMemo helper if React doesn't support useMemo import in default files

