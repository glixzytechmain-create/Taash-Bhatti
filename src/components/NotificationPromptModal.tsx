import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, X, Clock } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';

interface NotificationPromptModalProps {
  user: User | null;
  fbUser: any;
  isOpenOverride?: boolean;
  onCloseOverride?: () => void;
  onPreferencesUpdated?: () => void;
}

const LOCAL_STORAGE_KEY_CHOICE = 'taash_notif_choice'; // 'enabled' | 'later' | 'never'
const LOCAL_STORAGE_KEY_TIME = 'taash_notif_last_prompt_time';
const REPROMPT_INTERVAL_MS = 72 * 60 * 60 * 1000; // 72 hours

export default function NotificationPromptModal({
  user,
  fbUser,
  isOpenOverride,
  onCloseOverride,
  onPreferencesUpdated,
}: NotificationPromptModalProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false);

  const activeIsOpen = isOpenOverride !== undefined ? isOpenOverride : isOpen;

  useEffect(() => {
    if (isOpenOverride !== undefined) return;

    // ONLY FOR SIGNED-IN USERS (Do not prompt guests)
    if (!fbUser) return;

    // Check if browser supports notifications
    const isSupported = typeof window !== 'undefined' && 'Notification' in window;

    // Read stored choice & timestamp from localStorage and user object
    const storedChoice = localStorage.getItem(LOCAL_STORAGE_KEY_CHOICE) || user?.notificationPromptChoice;
    const storedTimeStr = localStorage.getItem(LOCAL_STORAGE_KEY_TIME) || user?.lastNotificationPromptAt;
    const storedTime = storedTimeStr ? parseInt(storedTimeStr, 10) : 0;

    // Check actual browser permission status if supported
    const browserPermission = isSupported ? Notification.permission : 'default';

    // If user already granted or selected 'enabled' or 'never', do not auto-prompt
    if (storedChoice === 'enabled' || storedChoice === 'never' || browserPermission === 'granted') {
      return;
    }

    // If choice is 'later', check if 72 hours have passed
    if (storedChoice === 'later') {
      const now = Date.now();
      if (now - storedTime < REPROMPT_INTERVAL_MS) {
        return;
      }
    }

    // Otherwise, show prompt after a short delay
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, fbUser, isOpenOverride]);

  const saveChoice = async (choice: 'enabled' | 'later' | 'never', pushEnabled: boolean) => {
    const nowStr = Date.now().toString();
    localStorage.setItem(LOCAL_STORAGE_KEY_CHOICE, choice);
    localStorage.setItem(LOCAL_STORAGE_KEY_TIME, nowStr);

    if (fbUser && fbUser.uid) {
      try {
        await updateDoc(doc(db, 'users', fbUser.uid), {
          notificationPromptChoice: choice,
          lastNotificationPromptAt: nowStr,
          pushNotificationsEnabled: pushEnabled,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Could not save notification prefs to Firestore:", err);
      }
    }

    if (onPreferencesUpdated) {
      onPreferencesUpdated();
    }
  };

  // Helper function to safely request browser notification permission across all browsers, mobile webviews & iOS/Android
  const requestDeviceNotificationPermission = (): Promise<NotificationPermission> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        resolve('denied');
        return;
      }

      try {
        // Dual mode: Support callback style (older Safari/Android WebViews) and Promise style (modern Chrome/Edge/Firefox)
        const result = Notification.requestPermission((perm) => {
          resolve(perm);
        });

        if (result && typeof (result as any).then === 'function') {
          (result as any).then(resolve).catch(() => resolve('denied'));
        }
      } catch (e) {
        try {
          Notification.requestPermission().then(resolve).catch(() => resolve('denied'));
        } catch (err) {
          resolve('denied');
        }
      }
    });
  };

  const handleTurnOn = async () => {
    setIsRequestingPermission(true);
    let granted = false;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      const currentPerm = Notification.permission;

      if (currentPerm === 'denied') {
        alert(
          "⚠️ Notifications are currently blocked in your browser site settings.\n\n" +
          "To enable real-time order updates:\n" +
          "1. Click the Lock 🔒 or Settings icon near your browser address bar.\n" +
          "2. Set Notifications to 'Allow'.\n" +
          "3. Refresh the page to receive updates!"
        );
      } else {
        const perm = await requestDeviceNotificationPermission();
        if (perm === 'granted') {
          granted = true;
          try {
            new Notification("🔔 Fitzaika • Taash Bhatti Device Notifications Active!", {
              body: "You'll now receive real-time updates on your orders, special chef releases, and exclusive offer drops directly on your device.",
              icon: "https://cdn.postimage.me/2026/08/01/28172.png",
            });
          } catch (e) {
            console.warn("Could not dispatch welcome native notification:", e);
          }
        } else if (perm === 'denied') {
          alert(
            "⚠️ Device notification permission was denied.\n" +
            "You can enable notifications anytime in your browser site permissions."
          );
        }
      }
    } else {
      granted = true;
    }

    await saveChoice('enabled', granted);
    setIsRequestingPermission(false);
    if (onCloseOverride) onCloseOverride();
    else setIsOpen(false);
  };

  const handleLater = async () => {
    await saveChoice('later', false);
    if (onCloseOverride) onCloseOverride();
    else setIsOpen(false);
  };

  const handleNever = async () => {
    await saveChoice('never', false);
    if (onCloseOverride) onCloseOverride();
    else setIsOpen(false);
  };

  if (!activeIsOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleLater}
          className="fixed inset-0 bg-[#06080B]/85 backdrop-blur-md"
        />

        {/* Modal Content Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-[#0F141A] border border-brand-orange/50 rounded-3xl w-full max-w-lg p-4 sm:p-5 shadow-2xl z-10 text-center overflow-hidden my-auto max-h-[94vh] flex flex-col justify-between"
        >
          {/* Top Close Button */}
          <button
            type="button"
            onClick={handleLater}
            className="absolute top-3 right-3 z-30 p-2 bg-black/60 hover:bg-black text-gray-300 hover:text-white rounded-full transition-all border border-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Graphic Container with Precision Overlay Hotspot */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-white/5 shadow-inner border border-white/10 group">
            <img
              src="https://cdn.postimage.me/2026/08/02/28764.png"
              alt="Turn On Notifications"
              className="w-full h-auto object-contain max-h-[62vh] mx-auto select-none"
            />

            {/* HOTSPOT BUTTON OVERLAY EXACTLY ON THE IMAGE'S 'TURN ON' BUTTON */}
            <button
              type="button"
              onClick={handleTurnOn}
              disabled={isRequestingPermission}
              title="Click here to Turn On Notifications"
              style={{
                top: '68.5%',
                left: '19.2%',
                width: '23.8%',
                height: '5.4%',
              }}
              className="absolute z-20 rounded-full border-2 border-amber-400 bg-brand-orange/20 hover:bg-brand-orange/40 hover:scale-105 transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.8)] animate-pulse flex items-center justify-center group/btn"
            >
              <span className="sr-only">Turn On Notifications</span>
              <span className="text-[9px] sm:text-[10px] font-black text-white bg-black/80 px-2 py-0.5 rounded-full border border-amber-400 shadow-md flex items-center gap-1 opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap -top-7 absolute">
                <Bell className="w-3 h-3 text-brand-orange" /> Tap to Enable!
              </span>
            </button>
          </div>

          {/* Bottom Action Bar */}
          <div className="space-y-2.5 pt-3">
            <button
              type="button"
              onClick={handleTurnOn}
              disabled={isRequestingPermission}
              className="w-full py-3.5 bg-gradient-to-r from-brand-orange to-amber-500 hover:from-brand-orange/90 hover:to-amber-600 text-brand-charcoal font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer border-none"
            >
              <Bell className="w-4 h-4 fill-current animate-bounce" />
              {isRequestingPermission ? 'Requesting Permission...' : '🔔 TURN ON DEVICE NOTIFICATIONS'}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleLater}
                className="py-2.5 bg-[#18202A] hover:bg-[#202B38] text-gray-300 font-bold text-xs uppercase rounded-xl transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Ask in 72 Hours
              </button>

              <button
                type="button"
                onClick={handleNever}
                className="py-2.5 bg-[#18202A] hover:bg-[#202B38] text-gray-400 hover:text-rose-400 font-bold text-xs uppercase rounded-xl transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BellOff className="w-3.5 h-3.5" />
                Never Ask Again
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
