/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Check, 
  ChevronRight, 
  Layers, 
  Percent, 
  Gift, 
  Zap, 
  ArrowUp, 
  ArrowDown, 
  Copy, 
  AlertCircle,
  Clock,
  Search,
  SlidersHorizontal,
  Box,
  Eye,
  X
} from 'lucide-react';
import { DealOffer, DealOfferType, DealStep, Meal } from '../types';
import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ImageUploader } from './ImageUploader';

interface AdminDealsManagerProps {
  deals?: DealOffer[];
  meals: Meal[];
  onRefresh?: () => void;
}

const PRESET_DEAL_IMAGES = [
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80',
];

export default function AdminDealsManager({ deals: propDeals, meals, onRefresh }: AdminDealsManagerProps) {
  const [liveDeals, setLiveDeals] = useState<DealOffer[]>(propDeals || []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'deals'), (snapshot) => {
      const list: DealOffer[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as DealOffer);
      });
      list.sort((a, b) => (a.priorityOrder || 100) - (b.priorityOrder || 100));
      setLiveDeals(list);
    }, (error) => {
      console.warn('Firestore deals subscription error:', error);
    });
    return () => unsub();
  }, []);

  const deals = propDeals && propDeals.length > 0 ? propDeals : liveDeals;
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealOffer | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4>(1);
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState('CHEF SPECIAL');
  const [image, setImage] = useState(PRESET_DEAL_IMAGES[0]);
  const [offerType, setOfferType] = useState<DealOfferType>('build_your_deck');
  const [packagePrice, setPackagePrice] = useState<number>(399);
  const [originalPrice, setOriginalPrice] = useState<number>(550);
  const [pricingMode, setPricingMode] = useState<'flat_package' | 'calculated_with_discount' | 'base_plus_addons'>('flat_package');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [priorityOrder, setPriorityOrder] = useState<number>(1);
  const [dietaryType, setDietaryType] = useState<'all' | 'veg' | 'non_veg'>('all');
  const [validTimings, setValidTimings] = useState<('breakfast' | 'lunch' | 'dinner' | 'snack')[]>(['lunch', 'dinner']);
  const [termsText, setTermsText] = useState('Coupons cannot be combined with this exclusive deal\nValid on both delivery and takeaway\nSubject to fresh kitchen availability');

  // Dynamic Step Configuration for 'build_your_deck'
  const [steps, setSteps] = useState<DealStep[]>([
    {
      id: 'step-1',
      stepNumber: 1,
      title: 'Choose Your Royal Main Course',
      description: 'Select 1 signature charcoal-smoked protein delicacy',
      minSelection: 1,
      maxSelection: 1,
      eligibleMealIds: meals.slice(0, 4).map(m => m.id),
      extraPriceOverrides: {}
    },
    {
      id: 'step-2',
      stepNumber: 2,
      title: 'Choose Artisanal Breads / Fragrant Rice',
      description: 'Select 1 traditional accompaniment',
      minSelection: 1,
      maxSelection: 1,
      eligibleMealIds: meals.filter(m => m.name.toLowerCase().includes('rice') || m.name.toLowerCase().includes('naan') || m.name.toLowerCase().includes('roti')).map(m => m.id),
      extraPriceOverrides: {}
    },
    {
      id: 'step-3',
      stepNumber: 3,
      title: 'Choose Refreshing Cold Beverage',
      description: 'Select 1 digestive cooler or refresher',
      minSelection: 1,
      maxSelection: 1,
      eligibleMealIds: meals.filter(m => m.name.toLowerCase().includes('shake') || m.name.toLowerCase().includes('chaas') || m.name.toLowerCase().includes('cooler') || m.name.toLowerCase().includes('drink')).map(m => m.id),
      extraPriceOverrides: {}
    }
  ]);

  // Fixed Combo Items Configuration
  const [comboItems, setComboItems] = useState<{ mealId: string; quantity: number }[]>([]);

  // BOGO Configuration
  const [bogoPrimaryMealIds, setBogoPrimaryMealIds] = useState<string[]>([]);
  const [bogoRewardMealIds, setBogoRewardMealIds] = useState<string[]>([]);
  const [bogoDiscountPct, setBogoDiscountPct] = useState<number>(100);

  // Tiered Bundle Configuration
  const [bundleItemCount, setBundleItemCount] = useState<number>(3);
  const [bundleEligibleMealIds, setBundleEligibleMealIds] = useState<string[]>([]);

  // Flash Deal Configuration
  const [flashExpiresAt, setFlashExpiresAt] = useState<string>('');

  // Active step in the multi-step builder preview
  const [stepPickerDishQuery, setStepPickerDishQuery] = useState('');
  const [activeStepEditingIdx, setActiveStepEditingIdx] = useState<number>(0);

  const resetForm = () => {
    setEditingDeal(null);
    setFormStep(1);
    setTitle('');
    setTagline('');
    setDescription('');
    setBadge('CHEF SPECIAL');
    setImage(PRESET_DEAL_IMAGES[0]);
    setOfferType('build_your_deck');
    setPackagePrice(399);
    setOriginalPrice(550);
    setPricingMode('flat_package');
    setIsActive(true);
    setPriorityOrder(1);
    setDietaryType('all');
    setValidTimings(['lunch', 'dinner']);
    setTermsText('Coupons cannot be combined with this exclusive deal\nValid on both delivery and takeaway\nSubject to fresh kitchen availability');
    
    // Seed default starter steps if meals exist
    setSteps([
      {
        id: 'step-' + Date.now() + '-1',
        stepNumber: 1,
        title: 'Step 1: Choose Your Royal Main Course',
        description: 'Select 1 signature charcoal-smoked delicacy',
        minSelection: 1,
        maxSelection: 1,
        eligibleMealIds: meals.slice(0, 4).map(m => m.id),
        extraPriceOverrides: {}
      },
      {
        id: 'step-' + Date.now() + '-2',
        stepNumber: 2,
        title: 'Step 2: Choose Artisanal Breads / Rice',
        description: 'Select 1 carbohydrate accompaniment',
        minSelection: 1,
        maxSelection: 1,
        eligibleMealIds: meals.slice(4, 8).map(m => m.id),
        extraPriceOverrides: {}
      },
      {
        id: 'step-' + Date.now() + '-3',
        stepNumber: 3,
        title: 'Step 3: Choose Refreshing Drink or Dessert',
        description: 'Select 1 refreshing drink or artisanal sweet',
        minSelection: 1,
        maxSelection: 1,
        eligibleMealIds: meals.slice(8, 12).map(m => m.id),
        extraPriceOverrides: {}
      }
    ]);

    setComboItems(meals.slice(0, 3).map(m => ({ mealId: m.id, quantity: 1 })));
    setBogoPrimaryMealIds(meals.slice(0, 3).map(m => m.id));
    setBogoRewardMealIds(meals.slice(0, 5).map(m => m.id));
    setBogoDiscountPct(100);
    setBundleItemCount(3);
    setBundleEligibleMealIds(meals.slice(0, 6).map(m => m.id));
    setFlashExpiresAt('');
    setActiveStepEditingIdx(0);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setShowFormModal(true);
  };

  const handleOpenEditModal = (deal: DealOffer) => {
    setEditingDeal(deal);
    setFormStep(1);
    setTitle(deal.title || '');
    setTagline(deal.tagline || '');
    setDescription(deal.description || '');
    setBadge(deal.badge || 'CHEF SPECIAL');
    setImage(deal.image || PRESET_DEAL_IMAGES[0]);
    setOfferType(deal.offerType || 'build_your_deck');
    setPackagePrice(deal.packagePrice || 0);
    setOriginalPrice(deal.originalPrice || 0);
    setPricingMode(deal.pricingMode || 'flat_package');
    setIsActive(deal.isActive !== false);
    setPriorityOrder(deal.priorityOrder || 1);
    setDietaryType(deal.dietaryType || 'all');
    setValidTimings(deal.validTimings || ['lunch', 'dinner']);
    setTermsText((deal.terms || []).join('\n'));
    setSteps(deal.steps && deal.steps.length > 0 ? deal.steps : []);
    setComboItems(deal.comboItems || []);
    setBogoPrimaryMealIds(deal.bogoPrimaryMealIds || []);
    setBogoRewardMealIds(deal.bogoRewardMealIds || []);
    setBogoDiscountPct(deal.bogoDiscountPct !== undefined ? deal.bogoDiscountPct : 100);
    setBundleItemCount(deal.bundleItemCount || 3);
    setBundleEligibleMealIds(deal.bundleEligibleMealIds || []);
    setFlashExpiresAt(deal.flashExpiresAt || '');
    setActiveStepEditingIdx(0);
    setShowFormModal(true);
  };

  const handleDuplicateDeal = async (deal: DealOffer) => {
    try {
      const newId = 'deal-' + Date.now();
      const duplicated: DealOffer = {
        ...deal,
        id: newId,
        title: `${deal.title} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'deals', newId), duplicated);
      setFeedbackMsg({ type: 'success', text: `Duplicated "${deal.title}" successfully!` });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: `Failed to duplicate deal: ${err.message}` });
    }
  };

  const handleToggleActive = async (deal: DealOffer) => {
    try {
      const nextStatus = !deal.isActive;
      await setDoc(doc(db, 'deals', deal.id), {
        ...deal,
        isActive: nextStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setFeedbackMsg({
        type: 'success',
        text: nextStatus ? `Deal "${deal.title}" is now Enabled & Live for diners!` : `Deal "${deal.title}" is now Disabled & Hidden from diners.`
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: `Failed to toggle status: ${err.message}` });
    }
  };

  const handleDeleteDeal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'deals', id));
      setDeleteConfirmId(null);
      setFeedbackMsg({ type: 'success', text: 'Deal removed permanently from live database' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: `Delete failed: ${err.message}` });
    }
  };

  const handleDeleteAllDeals = async () => {
    if (!window.confirm("Are you sure you want to delete ALL deals from the live database? This action cannot be undone.")) {
      return;
    }
    setSaving(true);
    try {
      for (const d of deals) {
        await deleteDoc(doc(db, 'deals', d.id));
      }
      setFeedbackMsg({ type: 'success', text: 'All deals deleted from live database!' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: `Failed to delete all deals: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  // Step manipulation for 'build_your_deck'
  const handleAddStep = () => {
    const nextNum = steps.length + 1;
    const newStep: DealStep = {
      id: 'step-' + Date.now(),
      stepNumber: nextNum,
      title: `Step ${nextNum}: Custom Selection`,
      description: `Select your preferred item`,
      minSelection: 1,
      maxSelection: 1,
      eligibleMealIds: meals.slice(0, 3).map(m => m.id),
      extraPriceOverrides: {}
    };
    setSteps([...steps, newStep]);
    setActiveStepEditingIdx(steps.length);
  };

  const handleRemoveStep = (idx: number) => {
    const updated = steps.filter((_, i) => i !== idx).map((s, i) => ({
      ...s,
      stepNumber: i + 1,
      title: s.title.startsWith('Step ') ? `Step ${i + 1}: ` + s.title.replace(/^Step \d+:\s*/, '') : s.title
    }));
    setSteps(updated);
    setActiveStepEditingIdx(Math.max(0, idx - 1));
  };

  const handleMoveStep = (idx: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === steps.length - 1)) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...steps];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    const renumbered = updated.map((s, i) => ({
      ...s,
      stepNumber: i + 1,
      title: s.title.startsWith('Step ') ? `Step ${i + 1}: ` + s.title.replace(/^Step \d+:\s*/, '') : s.title
    }));
    setSteps(renumbered);
    setActiveStepEditingIdx(targetIdx);
  };

  const handleToggleMealInStep = (stepIdx: number, mealId: string) => {
    setSteps(prev => {
      const copy = [...prev];
      const targetStep = { ...copy[stepIdx] };
      const currentList = targetStep.eligibleMealIds || [];
      if (currentList.includes(mealId)) {
        targetStep.eligibleMealIds = currentList.filter(id => id !== mealId);
      } else {
        targetStep.eligibleMealIds = [...currentList, mealId];
      }
      copy[stepIdx] = targetStep;
      return copy;
    });
  };

  // Fixed combo helpers
  const handleToggleMealInCombo = (mealId: string) => {
    const exists = comboItems.some(c => c.mealId === mealId);
    if (exists) {
      setComboItems(comboItems.filter(c => c.mealId !== mealId));
    } else {
      setComboItems([...comboItems, { mealId, quantity: 1 }]);
    }
  };

  const handleUpdateComboQuantity = (mealId: string, delta: number) => {
    setComboItems(comboItems.map(c => {
      if (c.mealId === mealId) {
        return { ...c, quantity: Math.max(1, c.quantity + delta) };
      }
      return c;
    }));
  };

  // Compute calculated combo standalone sum for comparison
  const calculatedComboOriginalSum = comboItems.reduce((sum, item) => {
    const m = meals.find(m => m.id === item.mealId);
    return sum + (m ? m.price * item.quantity : 0);
  }, 0);

  // Save deal to Firestore
  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please provide a Deal Title');
      return;
    }
    if (packagePrice <= 0) {
      alert('Package deal price must be greater than 0');
      return;
    }

    if (offerType === 'build_your_deck' && steps.length === 0) {
      alert('Please add at least 1 custom step for Build Your Own Deck offer');
      return;
    }

    if (offerType === 'fixed_combo' && comboItems.length === 0) {
      alert('Please add at least 1 dish to the Fixed Combo');
      return;
    }

    if (offerType === 'bogo' && (bogoPrimaryMealIds.length === 0 || bogoRewardMealIds.length === 0)) {
      alert('Please select both Primary eligible dishes and Reward dishes for BOGO');
      return;
    }

    setSaving(true);
    const dealId = editingDeal ? editingDeal.id : 'deal-' + Date.now();
    const computedDiscountPct = originalPrice > packagePrice 
      ? Math.round(((originalPrice - packagePrice) / originalPrice) * 100) 
      : 0;

    const termsArray = termsText
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const dealPayload: DealOffer = {
      id: dealId,
      title: title.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      badge: badge.trim(),
      image: image.trim() || PRESET_DEAL_IMAGES[0],
      offerType,
      pricingMode,
      packagePrice: Number(packagePrice),
      originalPrice: Number(originalPrice) || Number(packagePrice),
      discountPct: computedDiscountPct,
      isActive,
      priorityOrder: Number(priorityOrder) || 1,
      dietaryType,
      validTimings,
      terms: termsArray,
      createdAt: editingDeal?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (offerType === 'build_your_deck') {
      dealPayload.steps = steps;
    } else if (offerType === 'fixed_combo') {
      dealPayload.comboItems = comboItems;
    } else if (offerType === 'bogo') {
      dealPayload.bogoPrimaryMealIds = bogoPrimaryMealIds;
      dealPayload.bogoRewardMealIds = bogoRewardMealIds;
      dealPayload.bogoDiscountPct = bogoDiscountPct;
    } else if (offerType === 'tiered_bundle') {
      dealPayload.bundleItemCount = bundleItemCount;
      dealPayload.bundleEligibleMealIds = bundleEligibleMealIds;
    } else if (offerType === 'flash_deal') {
      dealPayload.flashExpiresAt = flashExpiresAt;
    }

    try {
      await setDoc(doc(db, 'deals', dealId), dealPayload, { merge: true });
      setShowFormModal(false);
      setFeedbackMsg({ 
        type: 'success', 
        text: editingDeal ? `Updated "${title}" successfully!` : `Created new deal "${title}" in live database!` 
      });
      setTimeout(() => setFeedbackMsg(null), 3500);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error saving deal:', err);
      setFeedbackMsg({ type: 'error', text: `Failed to save deal: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  // Filtered deals for table
  const filteredDeals = deals.filter(deal => {
    if (filterType !== 'all' && deal.offerType !== filterType) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchesTitle = deal.title?.toLowerCase().includes(q);
      const matchesTag = deal.tagline?.toLowerCase().includes(q);
      const matchesDesc = deal.description?.toLowerCase().includes(q);
      if (!matchesTitle && !matchesTag && !matchesDesc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-[#12181E] border border-brand-green/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-brand-orange/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center text-brand-orange">
                <Tag className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                Deals & Offers Studio
              </h2>
              <span className="text-[9px] bg-brand-green/20 text-brand-green font-mono px-2 py-0.5 rounded-full border border-brand-green/30">
                {deals.length} Live in Database
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 max-w-2xl">
              Create and manage step-by-step custom deck boxes, fixed combos, BOGO promotions, and flash deals with custom questions, eligible dishes, and pricing rules.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {deals.length > 0 && (
              <button
                type="button"
                id="btn-delete-all-deals"
                onClick={handleDeleteAllDeals}
                disabled={saving}
                className="px-3.5 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Deals</span>
              </button>
            )}

            <button
              type="button"
              id="btn-create-new-deal"
              onClick={handleOpenCreateModal}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-orange to-amber-500 text-brand-charcoal font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-brand-orange/20"
            >
              <Plus className="w-4 h-4 text-brand-charcoal stroke-[3]" />
              <span>Create New Deal</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/60 border-red-500/40 text-red-300'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg.text}</span>
          </motion.div>
        )}

        {/* Filter Pills & Search */}
        <div className="mt-6 pt-5 border-t border-brand-green/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Types', icon: Layers },
              { id: 'build_your_deck', label: '📦 Build Your Deck', icon: Box },
              { id: 'fixed_combo', label: '🍱 Fixed Combos', icon: Tag },
              { id: 'bogo', label: '🎁 BOGO (Buy 1 Get 1)', icon: Gift },
              { id: 'tiered_bundle', label: '🏷️ Bundles', icon: Percent },
              { id: 'flash_deal', label: '⚡ Flash Deals', icon: Zap },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = filterType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-brand-green text-brand-charcoal shadow-md shadow-brand-green/20'
                      : 'bg-brand-charcoal/60 hover:bg-brand-charcoal text-gray-400 hover:text-white border border-brand-green/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deals..."
              className="w-full bg-brand-charcoal/80 border border-brand-green/20 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green"
            />
          </div>
        </div>
      </div>

      {/* Deals Grid Cards */}
      {filteredDeals.length === 0 ? (
        <div className="bg-[#12181E] border border-dashed border-brand-green/20 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-brand-orange/10 border border-brand-orange/20 mx-auto flex items-center justify-center text-brand-orange text-2xl">
            🏷️
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Deals Configured</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              {deals.length === 0 
                ? 'No custom deals or offers exist in the database yet. Click "Create New Deal" to design your first custom deck or combo offer.'
                : 'No deals match the selected filter criteria.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-brand-green text-brand-charcoal font-black text-xs uppercase tracking-wider hover:brightness-110 cursor-pointer"
            >
              + Create New Deal
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDeals.map((deal) => {
            const isDeck = deal.offerType === 'build_your_deck';
            const isCombo = deal.offerType === 'fixed_combo';
            const isBogo = deal.offerType === 'bogo';

            return (
              <div
                key={deal.id}
                className={`bg-[#12181E] border rounded-3xl overflow-hidden flex flex-col justify-between transition-all group ${
                  deal.isActive 
                    ? 'border-brand-green/25 hover:border-brand-green/50 shadow-xl' 
                    : 'border-gray-800 opacity-60 hover:opacity-100'
                }`}
              >
                {/* Card Top Image & Badges */}
                <div className="relative h-44 w-full bg-brand-charcoal overflow-hidden">
                  <img
                    src={deal.image || PRESET_DEAL_IMAGES[0]}
                    alt={deal.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12181E] via-black/40 to-transparent" />
                  
                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                    {deal.badge && (
                      <span className="px-2.5 py-1 rounded-full bg-brand-orange text-brand-charcoal font-black text-[10px] uppercase tracking-wider shadow-md">
                        {deal.badge}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      isDeck ? 'bg-purple-950/80 text-purple-300 border-purple-500/40' :
                      isCombo ? 'bg-blue-950/80 text-blue-300 border-blue-500/40' :
                      isBogo ? 'bg-amber-950/80 text-amber-300 border-amber-500/40' :
                      'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {deal.offerType.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Active Toggle on Card */}
                  <button
                    onClick={() => handleToggleActive(deal)}
                    title={deal.isActive ? 'Active - Click to pause' : 'Paused - Click to activate'}
                    className={`absolute top-3 right-3 px-2 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 backdrop-blur-md border cursor-pointer ${
                      deal.isActive
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${deal.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                    {deal.isActive ? 'Active' : 'Paused'}
                  </button>

                  {/* Pricing on bottom of image */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-white">₹{deal.packagePrice}</span>
                        {deal.originalPrice && deal.originalPrice > deal.packagePrice && (
                          <span className="text-xs text-gray-400 line-through">₹{deal.originalPrice}</span>
                        )}
                      </div>
                      {deal.discountPct && deal.discountPct > 0 ? (
                        <span className="text-[10px] text-brand-orange font-bold">
                          Diner Saves {deal.discountPct}% OFF
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="text-sm font-black text-white leading-tight">
                      {deal.title}
                    </h3>
                    <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
                      {deal.tagline || deal.description}
                    </p>

                    {/* Step / Items Summary Preview */}
                    {isDeck && deal.steps && (
                      <div className="pt-2 border-t border-brand-green/10 space-y-1">
                        <span className="text-[10px] font-black text-brand-green uppercase tracking-wider block">
                          ⚙️ {deal.steps.length} Custom Diner Steps:
                        </span>
                        <div className="space-y-1">
                          {deal.steps.slice(0, 3).map((s, sIdx) => (
                            <div key={s.id || sIdx} className="text-[11px] text-gray-400 flex items-center justify-between">
                              <span className="truncate pr-2">• {s.title}</span>
                              <span className="text-[9px] font-mono text-gray-500 shrink-0">
                                {s.eligibleMealIds?.length || 0} options
                              </span>
                            </div>
                          ))}
                          {deal.steps.length > 3 && (
                            <span className="text-[10px] text-gray-500 italic block">
                              +{deal.steps.length - 3} more steps
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {isCombo && deal.comboItems && (
                      <div className="pt-2 border-t border-brand-green/10 space-y-1">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider block">
                          🍱 Included Combo Dishes ({deal.comboItems.length}):
                        </span>
                        <div className="space-y-1">
                          {deal.comboItems.map((ci, cIdx) => {
                            const found = meals.find(m => m.id === ci.mealId);
                            return (
                              <div key={ci.mealId || cIdx} className="text-[11px] text-gray-300 flex items-center justify-between">
                                <span className="truncate pr-2">• {ci.quantity}x {found?.name || ci.mealName || ci.mealId}</span>
                                <span className="text-[10px] font-mono text-gray-400 shrink-0">
                                  ₹{found ? found.price * ci.quantity : 0}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {isBogo && (
                      <div className="pt-2 border-t border-brand-green/10 text-[11px] text-amber-300/90 space-y-1">
                        <p>• Buy from <b>{deal.bogoPrimaryMealIds?.length || 0}</b> eligible signature dishes</p>
                        <p>• Get 1 dish from <b>{deal.bogoRewardMealIds?.length || 0}</b> rewards at <b>{deal.bogoDiscountPct || 100}% OFF</b></p>
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons with Enable/Disable Toggle */}
                  <div className="pt-3 border-t border-brand-green/10 space-y-2.5">
                    {/* Primary Enable / Disable Toggle Switch */}
                    <div className="flex items-center justify-between bg-black/30 px-3 py-2 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${deal.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'}`} />
                        <span className="text-[11px] font-bold text-gray-200">
                          {deal.isActive ? 'Deal is Active' : 'Deal is Disabled'}
                        </span>
                      </div>
                      <button
                        type="button"
                        id={`deal-status-toggle-${deal.id}`}
                        onClick={() => handleToggleActive(deal)}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          deal.isActive ? 'bg-emerald-500' : 'bg-stone-700'
                        }`}
                        title={deal.isActive ? 'Click to Disable Deal' : 'Click to Enable Deal'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            deal.isActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Secondary Actions: Edit, Duplicate, Delete */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleDuplicateDeal(deal)}
                        title="Duplicate this deal"
                        className="p-2 rounded-xl bg-brand-charcoal hover:bg-brand-charcoal/80 text-gray-400 hover:text-white border border-brand-green/10 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(deal)}
                          className="px-3.5 py-1.5 rounded-xl bg-brand-green/15 hover:bg-brand-green/25 text-brand-green border border-brand-green/30 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Deal</span>
                        </button>

                        {deleteConfirmId === deal.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteDeal(deal.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-red-500 text-white font-black text-xs hover:bg-red-600 transition-colors cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1.5 rounded-xl bg-brand-charcoal text-gray-400 text-xs hover:text-white"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(deal.id)}
                            title="Delete deal permanently"
                            className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MULTI-STEP DEAL CREATOR & EDITOR MODAL */}
      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#12181E] border border-brand-green/30 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden"
            >
              {/* Modal Top Header */}
              <div className="p-5 sm:p-6 border-b border-brand-green/20 bg-[#0F1419] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
                    {offerType === 'build_your_deck' ? <Box className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                      {editingDeal ? `Edit Deal: ${editingDeal.title}` : 'Create New Deal Package'}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Step {formStep} of 4: {
                        formStep === 1 ? 'Branding & Offer Type' :
                        formStep === 2 ? 'Step & Dish Configuration' :
                        formStep === 3 ? 'Package Pricing & Value' :
                        'Review & Terms'
                      }
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="w-8 h-8 rounded-full bg-brand-charcoal hover:bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Wizard Steps Progress Indicator */}
              <div className="px-6 pt-4 pb-2 bg-[#0F1419]/50 border-b border-brand-green/10 flex items-center justify-between shrink-0">
                {[
                  { step: 1, label: '1. Offer Type' },
                  { step: 2, label: '2. Steps & Dishes' },
                  { step: 3, label: '3. Pricing' },
                  { step: 4, label: '4. Finalize' },
                ].map((s) => (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setFormStep(s.step as any)}
                    className={`flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
                      formStep === s.step
                        ? 'text-brand-orange'
                        : formStep > s.step
                        ? 'text-brand-green'
                        : 'text-gray-500'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border ${
                      formStep === s.step
                        ? 'bg-brand-orange text-brand-charcoal border-brand-orange shadow-xs'
                        : formStep > s.step
                        ? 'bg-brand-green text-brand-charcoal border-brand-green'
                        : 'bg-brand-charcoal text-gray-500 border-gray-700'
                    }`}>
                      {formStep > s.step ? '✓' : s.step}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Modal Body Form Content */}
              <form onSubmit={handleSaveDeal} className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* STEP 1: Basic Info & Offer Type */}
                {formStep === 1 && (
                  <div className="space-y-6">
                    {/* Offer Type Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-brand-green block">
                        Select Deal Structure Type *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          {
                            type: 'build_your_deck' as DealOfferType,
                            title: '📦 Build Your Deck / Meal Box',
                            desc: 'Multi-step meal builder. Admin creates each custom step question (e.g. 1st choose Main, 2nd choose Bread/Rice, 3rd choose Drink, etc.)'
                          },
                          {
                            type: 'fixed_combo' as DealOfferType,
                            title: '🍱 Fixed Combo Package',
                            desc: 'Pre-bundled specific dishes with a single discounted package price. Diner adds to cart with 1 click.'
                          },
                          {
                            type: 'bogo' as DealOfferType,
                            title: '🎁 Buy 1 Get 1 (BOGO)',
                            desc: 'Diner buys 1 primary dish and gets 1 eligible complimentary reward dish for 100% Free or 50% Off.'
                          },
                          {
                            type: 'tiered_bundle' as DealOfferType,
                            title: '🏷️ Tiered Multi-Dish Bundle',
                            desc: 'Pick any N dishes (e.g. Pick any 3) from an eligible pool of meals for a flat bundle price.'
                          },
                          {
                            type: 'flash_deal' as DealOfferType,
                            title: '⚡ Flash Deal Countdown',
                            desc: 'Time-limited discounted deal with an active countdown timer.'
                          },
                        ].map((opt) => (
                          <div
                            key={opt.type}
                            onClick={() => setOfferType(opt.type)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                              offerType === opt.type
                                ? 'bg-brand-orange/15 border-brand-orange text-white shadow-md shadow-brand-orange/10'
                                : 'bg-brand-charcoal/60 border-brand-green/10 hover:border-brand-green/30 text-gray-400'
                            }`}
                          >
                            <div className="space-y-1">
                              <h4 className="text-xs font-black text-white flex items-center justify-between">
                                {opt.title}
                                {offerType === opt.type && <Check className="w-4 h-4 text-brand-orange" />}
                              </h4>
                              <p className="text-[11px] text-gray-400 leading-relaxed">{opt.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Deal Name & Tagline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-300">Deal Title *</label>
                        <input
                          type="text"
                          required
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Royal 4-Course Bhatti Feast Box"
                          className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-300">Badge Label</label>
                        <input
                          type="text"
                          value={badge}
                          onChange={(e) => setBadge(e.target.value)}
                          placeholder="e.g. CHEF SPECIAL, BOGO FREE, SAVE 35%"
                          className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-300">Tagline / Quick Subtitle</label>
                      <input
                        type="text"
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder="e.g. Craft your personalized 4-course royal meal box with chef tandoor specials"
                        className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-300">Full Description</label>
                      <textarea
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Detailed deal description, preparation story, and gourmet highlights..."
                        className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green"
                      />
                    </div>

                    {/* Image Selector & Direct File Upload */}
                    <div className="space-y-2">
                      <ImageUploader
                        value={image}
                        onChange={(url) => setImage(url)}
                        label="Deal Thumbnail / Banner (Direct Upload, Camera Photo, or URL)"
                        placeholder="Upload deal thumbnail directly from your computer/device or snap a photo"
                        compact={false}
                      />
                      <div className="pt-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                          Or Choose from Curated Preset Photos:
                        </span>
                        <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1">
                          {PRESET_DEAL_IMAGES.map((imgUrl, i) => (
                            <div
                              key={i}
                              onClick={() => setImage(imgUrl)}
                              className={`w-14 h-10 rounded-lg overflow-hidden border-2 cursor-pointer shrink-0 transition-transform ${
                                image === imgUrl ? 'border-brand-orange scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                              }`}
                            >
                              <img src={imgUrl} alt="preset" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Step & Dish Configuration */}
                {formStep === 2 && (
                  <div className="space-y-6">
                    {/* BUILD YOUR OWN DECK CONFIGURATOR */}
                    {offerType === 'build_your_deck' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-black text-brand-green uppercase tracking-wider">
                              Dynamic Step Builder ({steps.length} Steps)
                            </h4>
                            <p className="text-xs text-gray-400">
                              Define the sequence of questions and eligible dishes for the diner's custom deck.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddStep}
                            className="px-3.5 py-2 rounded-xl bg-brand-green text-brand-charcoal font-black text-xs uppercase flex items-center gap-1.5 hover:brightness-110 cursor-pointer shadow-md"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>+ Add Custom Step</span>
                          </button>
                        </div>

                        {/* Step Navigation Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-brand-green/10">
                          {steps.map((step, idx) => (
                            <button
                              key={step.id || idx}
                              type="button"
                              onClick={() => setActiveStepEditingIdx(idx)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                                activeStepEditingIdx === idx
                                  ? 'bg-brand-orange text-brand-charcoal shadow-md shadow-brand-orange/20'
                                  : 'bg-brand-charcoal text-gray-400 hover:text-white border border-brand-green/10'
                              }`}
                            >
                              <span>Step {idx + 1}</span>
                              <span className="text-[10px] font-mono opacity-80">
                                ({step.eligibleMealIds?.length || 0} dishes)
                              </span>
                            </button>
                          ))}
                        </div>

                        {/* Active Step Details & Dish Picker */}
                        {steps[activeStepEditingIdx] && (
                          <div className="bg-[#0F1419] border border-brand-green/20 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg bg-brand-green/20 text-brand-green font-black flex items-center justify-center text-xs">
                                  #{activeStepEditingIdx + 1}
                                </span>
                                <h5 className="text-xs font-black uppercase text-white">
                                  Configure Step {activeStepEditingIdx + 1}
                                </h5>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={activeStepEditingIdx === 0}
                                  onClick={() => handleMoveStep(activeStepEditingIdx, 'up')}
                                  title="Move step earlier"
                                  className="p-1.5 rounded-lg bg-brand-charcoal text-gray-300 hover:text-white disabled:opacity-30"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={activeStepEditingIdx === steps.length - 1}
                                  onClick={() => handleMoveStep(activeStepEditingIdx, 'down')}
                                  title="Move step later"
                                  className="p-1.5 rounded-lg bg-brand-charcoal text-gray-300 hover:text-white disabled:opacity-30"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                {steps.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStep(activeStepEditingIdx)}
                                    title="Delete this step"
                                    className="p-1.5 rounded-lg bg-red-950/50 text-red-400 hover:bg-red-900 border border-red-800/40"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-300">Step Title / Question Prompt *</label>
                                <input
                                  type="text"
                                  value={steps[activeStepEditingIdx].title}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSteps(prev => {
                                      const copy = [...prev];
                                      copy[activeStepEditingIdx].title = val;
                                      return copy;
                                    });
                                  }}
                                  placeholder="e.g. Step 1: Choose Your Royal Bhatti Main"
                                  className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-300">Step Subtitle / Hint</label>
                                <input
                                  type="text"
                                  value={steps[activeStepEditingIdx].description || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSteps(prev => {
                                      const copy = [...prev];
                                      copy[activeStepEditingIdx].description = val;
                                      return copy;
                                    });
                                  }}
                                  placeholder="e.g. Select 1 protein-rich signature dish"
                                  className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-green"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-300">Min Choices</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={5}
                                  value={steps[activeStepEditingIdx].minSelection}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    setSteps(prev => {
                                      const copy = [...prev];
                                      copy[activeStepEditingIdx].minSelection = val;
                                      return copy;
                                    });
                                  }}
                                  className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-300">Max Choices</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={steps[activeStepEditingIdx].maxSelection}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    setSteps(prev => {
                                      const copy = [...prev];
                                      copy[activeStepEditingIdx].maxSelection = val;
                                      return copy;
                                    });
                                  }}
                                  className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                                />
                              </div>
                            </div>

                            {/* Eligible Dishes Multi-Select Pool */}
                            <div className="space-y-2 pt-2 border-t border-brand-green/10">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-black uppercase text-brand-green">
                                  Eligible Dishes for Step {activeStepEditingIdx + 1} ({steps[activeStepEditingIdx].eligibleMealIds?.length || 0} selected)
                                </label>
                                <input
                                  type="text"
                                  value={stepPickerDishQuery}
                                  onChange={(e) => setStepPickerDishQuery(e.target.value)}
                                  placeholder="Search meals..."
                                  className="bg-brand-charcoal border border-brand-green/20 rounded-lg px-2.5 py-1 text-[11px] text-white placeholder-gray-500 w-44"
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                {meals
                                  .filter(m => {
                                    if (!stepPickerDishQuery) return true;
                                    return m.name.toLowerCase().includes(stepPickerDishQuery.toLowerCase());
                                  })
                                  .map((meal) => {
                                    const isSelected = steps[activeStepEditingIdx].eligibleMealIds?.includes(meal.id);
                                    return (
                                      <div
                                        key={meal.id}
                                        onClick={() => handleToggleMealInStep(activeStepEditingIdx, meal.id)}
                                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                          isSelected
                                            ? 'bg-brand-green/20 border-brand-green text-white'
                                            : 'bg-brand-charcoal/70 border-brand-green/10 hover:border-brand-green/25 text-gray-400'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 truncate pr-2">
                                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${meal.isVeg ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                          <span className="text-xs font-bold truncate text-white">{meal.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="text-[10px] font-mono text-gray-400">₹{meal.price}</span>
                                          <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                                            isSelected ? 'bg-brand-green text-brand-charcoal border-brand-green' : 'border-gray-600'
                                          }`}>
                                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* FIXED COMBO CONFIGURATOR */}
                    {offerType === 'fixed_combo' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-black text-brand-green uppercase tracking-wider">
                              Select Dishes Included in Fixed Combo
                            </h4>
                            <p className="text-xs text-gray-400">
                              Choose the exact dish items and quantities that make up this combo package.
                            </p>
                          </div>
                          {comboItems.length > 0 && (
                            <div className="text-right">
                              <span className="text-[10px] text-gray-400 block">Standalone Retail Sum:</span>
                              <span className="text-xs font-black text-amber-300 font-mono">₹{calculatedComboOriginalSum}</span>
                            </div>
                          )}
                        </div>

                        {/* Search and Dish selector */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto">
                          {meals.map((meal) => {
                            const found = comboItems.find(c => c.mealId === meal.id);
                            const isIncluded = !!found;
                            return (
                              <div
                                key={meal.id}
                                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                                  isIncluded
                                    ? 'bg-blue-950/40 border-blue-500/50 text-white'
                                    : 'bg-brand-charcoal/70 border-brand-green/10 text-gray-400 hover:border-brand-green/25'
                                }`}
                              >
                                <div
                                  className="flex items-center gap-2 truncate pr-2 cursor-pointer flex-1"
                                  onClick={() => handleToggleMealInCombo(meal.id)}
                                >
                                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${meal.isVeg ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                  <div className="truncate">
                                    <h5 className="text-xs font-bold text-white truncate">{meal.name}</h5>
                                    <span className="text-[10px] text-gray-400 font-mono">₹{meal.price}</span>
                                  </div>
                                </div>

                                {isIncluded ? (
                                  <div className="flex items-center gap-1.5 bg-brand-charcoal/80 rounded-xl px-2 py-1 border border-brand-green/20">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateComboQuantity(meal.id, -1)}
                                      className="w-5 h-5 rounded flex items-center justify-center text-xs font-black text-gray-300 hover:text-white"
                                    >
                                      -
                                    </button>
                                    <span className="text-xs font-black text-brand-orange w-4 text-center">
                                      {found.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateComboQuantity(meal.id, 1)}
                                      className="w-5 h-5 rounded flex items-center justify-center text-xs font-black text-gray-300 hover:text-white"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMealInCombo(meal.id)}
                                    className="px-2.5 py-1 rounded-xl bg-brand-green/15 text-brand-green border border-brand-green/25 text-[10px] font-black uppercase"
                                  >
                                    + Add
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* BOGO CONFIGURATOR */}
                    {offerType === 'bogo' && (
                      <div className="space-y-5">
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-brand-green uppercase tracking-wider">
                            Buy 1 Get 1 (BOGO) Rules
                          </h4>
                          <p className="text-xs text-gray-400">
                            Configure eligible primary dishes that diner buys, and the reward dishes they unlock for free or discounted.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Primary dishes */}
                          <div className="space-y-2 bg-[#0F1419] p-4 rounded-2xl border border-brand-green/15">
                            <label className="text-xs font-black text-brand-orange uppercase block">
                              1. Primary Eligible Dishes ({bogoPrimaryMealIds.length})
                            </label>
                            <span className="text-[10px] text-gray-400 block">Diner buys 1 of these:</span>
                            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                              {meals.map(m => {
                                const checked = bogoPrimaryMealIds.includes(m.id);
                                return (
                                  <div
                                    key={m.id}
                                    onClick={() => {
                                      setBogoPrimaryMealIds(prev => 
                                        checked ? prev.filter(id => id !== m.id) : [...prev, m.id]
                                      );
                                    }}
                                    className={`p-2 rounded-xl border text-xs flex items-center justify-between cursor-pointer ${
                                      checked ? 'bg-brand-orange/20 border-brand-orange text-white' : 'bg-brand-charcoal text-gray-400 border-gray-800'
                                    }`}
                                  >
                                    <span className="truncate pr-2">{m.name}</span>
                                    <span className="text-[10px] font-mono">₹{m.price}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Reward dishes */}
                          <div className="space-y-2 bg-[#0F1419] p-4 rounded-2xl border border-brand-green/15">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-black text-brand-green uppercase block">
                                2. Complimentary Reward Dishes ({bogoRewardMealIds.length})
                              </label>
                            </div>
                            <span className="text-[10px] text-gray-400 block">Diner picks 1 free/discounted from these:</span>
                            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                              {meals.map(m => {
                                const checked = bogoRewardMealIds.includes(m.id);
                                return (
                                  <div
                                    key={m.id}
                                    onClick={() => {
                                      setBogoRewardMealIds(prev => 
                                        checked ? prev.filter(id => id !== m.id) : [...prev, m.id]
                                      );
                                    }}
                                    className={`p-2 rounded-xl border text-xs flex items-center justify-between cursor-pointer ${
                                      checked ? 'bg-brand-green/20 border-brand-green text-white' : 'bg-brand-charcoal text-gray-400 border-gray-800'
                                    }`}
                                  >
                                    <span className="truncate pr-2">{m.name}</span>
                                    <span className="text-[10px] font-mono">₹{m.price}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-300">Discount on Reward Dish</label>
                          <div className="flex items-center gap-3">
                            {[
                              { label: '100% FREE ($0)', value: 100 },
                              { label: '50% OFF', value: 50 },
                              { label: '30% OFF', value: 30 },
                            ].map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setBogoDiscountPct(opt.value)}
                                className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${
                                  bogoDiscountPct === opt.value
                                    ? 'bg-amber-400 text-brand-charcoal border-amber-400'
                                    : 'bg-brand-charcoal text-gray-400 border-brand-green/10'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: Pricing & Availability */}
                {formStep === 3 && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-brand-green uppercase tracking-wider">
                        Package Pricing & Value Architecture
                      </h4>
                      <p className="text-xs text-gray-400">
                        Set the special package price and strike-through original value for transparency.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-brand-orange uppercase block">
                          Final Deal Package Price (₹) *
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={packagePrice}
                          onChange={(e) => setPackagePrice(Number(e.target.value))}
                          placeholder="399"
                          className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-brand-green"
                        />
                        <span className="text-[10px] text-gray-400">
                          This is what the customer pays for the entire package.
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-300 block">
                          Original Retail Value (₹)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={originalPrice}
                          onChange={(e) => setOriginalPrice(Number(e.target.value))}
                          placeholder="599"
                          className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-brand-green"
                        />
                        <span className="text-[10px] text-gray-400">
                          Used to calculate discount badge (e.g. Save 35% OFF).
                        </span>
                      </div>
                    </div>

                    {/* Calculated Savings Preview Banner */}
                    {originalPrice > packagePrice && (
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-orange/20 to-amber-500/10 border border-brand-orange/30 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-brand-orange uppercase">
                            Diner Savings Calculation:
                          </span>
                          <p className="text-[11px] text-gray-300">
                            Customer saves <b>₹{originalPrice - packagePrice}</b> ({Math.round(((originalPrice - packagePrice) / originalPrice) * 100)}% discount)
                          </p>
                        </div>
                        <span className="px-3 py-1.5 rounded-xl bg-brand-orange text-brand-charcoal font-black text-xs">
                          {Math.round(((originalPrice - packagePrice) / originalPrice) * 100)}% OFF
                        </span>
                      </div>
                    )}

                    {/* Dietary & Priority */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-brand-green/10">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-300">Dietary Filter Classification</label>
                        <select
                          value={dietaryType}
                          onChange={(e) => setDietaryType(e.target.value as any)}
                          className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="all">All (Veg & Non-Veg Options)</option>
                          <option value="veg">Pure Vegetarian Deals Only</option>
                          <option value="non_veg">Non-Vegetarian Special</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-300">Display Priority Order</label>
                        <input
                          type="number"
                          value={priorityOrder}
                          onChange={(e) => setPriorityOrder(Number(e.target.value))}
                          placeholder="1"
                          className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: Terms & Live Review */}
                {formStep === 4 && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-brand-green uppercase tracking-wider">
                        Terms of Offer & Final Verification
                      </h4>
                      <p className="text-xs text-gray-400">
                        Review the complete package structure before publishing to the live restaurant database.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-300">Terms & Conditions (1 per line)</label>
                      <textarea
                        rows={3}
                        value={termsText}
                        onChange={(e) => setTermsText(e.target.value)}
                        placeholder="Coupons cannot be combined with this deal..."
                        className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none"
                      />
                    </div>

                    {/* Summary Card Preview */}
                    <div className="bg-[#0F1419] border border-brand-green/30 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">{title || 'Untitled Deal'}</span>
                          {badge && (
                            <span className="text-[9px] bg-brand-orange text-brand-charcoal font-black px-2 py-0.5 rounded-full">
                              {badge}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-black text-brand-green">₹{packagePrice}</span>
                          {originalPrice > packagePrice && (
                            <span className="text-xs text-gray-400 line-through">₹{originalPrice}</span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-gray-300">{tagline || description}</p>

                      <div className="pt-2 border-t border-brand-green/10 text-[11px] text-gray-400 flex items-center justify-between">
                        <span>Structure: <b>{offerType.replace(/_/g, ' ')}</b></span>
                        <span className="text-emerald-400 font-bold">✓ Ready for Live Ordering</span>
                      </div>
                    </div>
                  </div>
                )}
              </form>

              {/* Modal Footer Controls */}
              <div className="p-5 border-t border-brand-green/20 bg-[#0F1419] flex items-center justify-between shrink-0">
                <button
                  type="button"
                  disabled={formStep === 1}
                  onClick={() => setFormStep(Math.max(1, formStep - 1) as any)}
                  className="px-4 py-2 rounded-xl bg-brand-charcoal text-gray-300 hover:text-white text-xs font-bold disabled:opacity-30 cursor-pointer"
                >
                  ← Previous Step
                </button>

                <div className="flex items-center gap-3">
                  {formStep < 4 ? (
                    <button
                      type="button"
                      onClick={() => setFormStep(Math.min(4, formStep + 1) as any)}
                      className="px-5 py-2.5 rounded-xl bg-brand-green text-brand-charcoal font-black text-xs uppercase tracking-wider hover:brightness-110 flex items-center gap-1 cursor-pointer shadow-md"
                    >
                      <span>Next Step</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSaveDeal}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-orange to-amber-500 text-brand-charcoal font-black text-xs uppercase tracking-wider hover:brightness-110 flex items-center gap-2 cursor-pointer shadow-lg shadow-brand-orange/25 disabled:opacity-50"
                    >
                      {saving ? (
                        <span>Saving to Database...</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>{editingDeal ? 'Update Live Deal' : 'Publish Deal to App'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
