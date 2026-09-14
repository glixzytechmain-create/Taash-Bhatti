/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Bell,
  X,
  Send,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  Clock,
  Volume2,
  ChevronRight,
  Flame,
  Info
} from 'lucide-react';
import {
  NOTIFICATION_CAMPAIGNS,
  NotificationCampaign,
  interpolateNotificationText,
  smartPushService,
} from '../lib/smartPushService';

interface SmartPushTesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCartFirstDish?: string;
  cityName?: string;
  walletBalance?: number;
}

export const SmartPushTesterModal: React.FC<SmartPushTesterModalProps> = ({
  isOpen,
  onClose,
  currentCartFirstDish = 'Chicken Dum Biryani',
  cityName = 'Muzaffarpur',
  walletBalance = 150,
}) => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(NOTIFICATION_CAMPAIGNS[0].id);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number>(0);
  const [testDishName, setTestDishName] = useState<string>(currentCartFirstDish);
  const [testCityName, setTestCityName] = useState<string>(cityName);
  const [testWalletBalance, setTestWalletBalance] = useState<number>(walletBalance);

  const [fireStatus, setFireStatus] = useState<string | null>(null);
  const [isFiring, setIsFiring] = useState<boolean>(false);

  if (!isOpen) return null;

  const activeCampaign =
    NOTIFICATION_CAMPAIGNS.find((c) => c.id === selectedCampaignId) || NOTIFICATION_CAMPAIGNS[0];
  const activeTemplate = activeCampaign.templates[selectedTemplateIndex % activeCampaign.templates.length];

  const previewTitle = interpolateNotificationText(activeTemplate.title, {
    dishName: testDishName,
    cityName: testCityName,
    walletBalance: testWalletBalance,
  });

  const previewBody = interpolateNotificationText(activeTemplate.body, {
    dishName: testDishName,
    cityName: testCityName,
    walletBalance: testWalletBalance,
  });

  const handleFireTest = async () => {
    setIsFiring(true);
    setFireStatus('Requesting permissions & firing...');

    try {
      await smartPushService.requestPermissions();
      const res = await smartPushService.testFireNotification(
        selectedCampaignId,
        selectedTemplateIndex,
        {
          dishName: testDishName,
          cityName: testCityName,
          walletBalance: testWalletBalance,
        }
      );

      setFireStatus(`Fired! Check your phone notification tray / lock screen: "${res.title}"`);
    } catch (e: any) {
      setFireStatus(`Error: ${e?.message || 'Could not fire'}`);
    } finally {
      setIsFiring(false);
      setTimeout(() => setFireStatus(null), 6000);
    }
  };

  const handleTestAbandonedCartFast = async () => {
    setIsFiring(true);
    setFireStatus('Armed 5-second abandoned cart alarm. Lock your phone or minimize app now!');

    try {
      await smartPushService.requestPermissions();
      await smartPushService.scheduleAbandonedCartPush(testDishName, 5); // 5 seconds for instant testing
    } catch (e: any) {
      setFireStatus(`Error: ${e?.message || 'Failed'}`);
    } finally {
      setIsFiring(false);
      setTimeout(() => setFireStatus(null), 8000);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#10141d] text-white border border-amber-500/30 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Smart Push Notification Pusher</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  10 Campaigns
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Test lock-screen & notification tray delivery across all 10 automated foodie scenarios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Status feedback message */}
          {fireStatus && (
            <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-start gap-2.5 text-amber-200 text-xs animate-fade-in">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{fireStatus}</p>
            </div>
          )}

          {/* Campaign Selector Grid */}
          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Select Automated Campaign (1 of 10)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {NOTIFICATION_CAMPAIGNS.map((c, idx) => {
                const isSelected = c.id === selectedCampaignId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCampaignId(c.id);
                      setSelectedTemplateIndex(0);
                    }}
                    className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-md shadow-amber-500/10'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                    }`}
                  >
                    <span className="text-[10px] font-mono text-amber-400/80 mb-1">#{idx + 1}</span>
                    <span className="text-xs font-bold leading-tight line-clamp-2">{c.name}</span>
                    <span className="text-[9px] text-gray-400 mt-1">
                      {c.templates.length} templates
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-2 italic flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{activeCampaign.triggerDescription}</span>
            </p>
          </div>

          {/* Template Tabs for Selected Campaign */}
          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Select Copy Template ({activeCampaign.templates.length} Available)
            </label>
            <div className="flex flex-wrap gap-2">
              {activeCampaign.templates.map((tpl, tIdx) => {
                const isTplSelected = tIdx === selectedTemplateIndex;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplateIndex(tIdx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isTplSelected
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black border-transparent shadow-sm'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    Template {String.fromCharCode(65 + tIdx)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Values Customizer */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              Test Parameters (Dynamic Tags)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">[dishName]</label>
                <input
                  type="text"
                  value={testDishName}
                  onChange={(e) => setTestDishName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:border-amber-400 focus:outline-none"
                  placeholder="e.g. Chicken Dum Biryani"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">[cityName]</label>
                <input
                  type="text"
                  value={testCityName}
                  onChange={(e) => setTestCityName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:border-amber-400 focus:outline-none"
                  placeholder="e.g. Muzaffarpur"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">[walletBalance]</label>
                <input
                  type="number"
                  value={testWalletBalance}
                  onChange={(e) => setTestWalletBalance(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:border-amber-400 focus:outline-none"
                  placeholder="e.g. 150"
                />
              </div>
            </div>
          </div>

          {/* Lock Screen Notification Live Preview Box */}
          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Lock-Screen Notification Banner Preview
            </label>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-[#151c28] to-slate-900 border border-amber-500/40 shadow-xl relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Flame className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider">
                      TAASH BHATTI
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">Now</span>
                  </div>
                  <h4 className="text-sm font-bold text-white leading-snug">{previewTitle}</h4>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">{previewBody}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-black/40 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-gray-400 text-center sm:text-left">
            <span>Fires to native Android/iOS lock screen & shade</span>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {selectedCampaignId === 'cart_abandoned' && (
              <button
                onClick={handleTestAbandonedCartFast}
                disabled={isFiring}
                className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-2xl bg-orange-600/30 border border-orange-500/50 text-orange-200 text-xs font-bold hover:bg-orange-600/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>Test 5s Cart Timer</span>
              </button>
            )}
            <button
              onClick={handleFireTest}
              disabled={isFiring}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black text-xs hover:from-amber-400 hover:to-orange-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Fire Test Push Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
