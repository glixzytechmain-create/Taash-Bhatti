/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalNotifications, ScheduleOptions, Channel } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface NotificationTemplate {
  id: string;
  title: string;
  body: string;
}

export interface NotificationCampaign {
  id: string;
  name: string;
  triggerDescription: string;
  templates: NotificationTemplate[];
}

// Notification IDs (IDs must be 32-bit positive integers for Android)
export const NOTIF_IDS = {
  CART_ABANDONED: 1001,
  LUNCH_RUSH: 1002,
  LATE_NIGHT: 1003,
  RAIN_WEATHER: 1004,
  WEEKEND_UNWIND: 1005,
  WE_MISS_YOU: 1006,
  DINNER_BELL: 1007,
  SUNDAY_FEAST: 1008,
  WALLET_CASH: 1009,
  GROUP_DAWAT: 1010,
  QUICK_TEST: 9999,
};

export const NOTIFICATION_CAMPAIGNS: NotificationCampaign[] = [
  {
    id: 'cart_abandoned',
    name: 'Abandoned Cart (5 Mins Post-Exit)',
    triggerDescription: 'Triggered 5 minutes after leaving the app with items remaining in the cart.',
    templates: [
      {
        id: 'cart_1',
        title: 'Your [dishName] is feeling lonely... 🥺',
        body: "It's sitting in your cart wondering what it did wrong. Tap here to finish your order!",
      },
      {
        id: 'cart_2',
        title: 'Did you forget about [dishName]? 👀',
        body: "You were one step away from pure happiness. Don't leave your tastebuds hanging!",
      },
      {
        id: 'cart_3',
        title: 'The chef is ready for your [dishName]! 👨‍🍳🔥',
        body: 'The bhatti is hot and waiting. One tap to fire up your order!',
      },
      {
        id: 'cart_4',
        title: 'Your stomach just sighed... 😮‍💨',
        body: 'It saw you add [dishName] and then you closed the app? Complete your order now!',
      },
      {
        id: 'cart_5',
        title: 'Still craving [dishName]? ⏳',
        body: "It's still warm in your cart. Check out now before someone else orders the last portion!",
      },
    ],
  },
  {
    id: 'lunch_rush',
    name: 'Lunch Rush / Work Hunger (12:45 PM)',
    triggerDescription: 'Triggered during afternoon lunch window (12:45 PM - 1:15 PM).',
    templates: [
      {
        id: 'lunch_1',
        title: 'Work can wait, lunch cannot! ⏰',
        body: 'That dal-chawal from home or fresh hot biryani from Taash Bhatti? You know the right answer.',
      },
      {
        id: 'lunch_2',
        title: 'That 1 PM hunger pang just hit, didn’t it? 🥘',
        body: 'Skip the office canteen. Order piping hot curries and tandoori rotis right to your desk.',
      },
      {
        id: 'lunch_3',
        title: 'Meeting could have been an email... lunch cannot! 🍱',
        body: 'Treat yourself to something delicious today. Hot lunch dispatched in minutes!',
      },
    ],
  },
  {
    id: 'late_night',
    name: 'Midnight Munchies (10:30 PM)',
    triggerDescription: 'Triggered late evening for night owls & binge-watchers.',
    templates: [
      {
        id: 'late_1',
        title: 'Stop staring into the empty fridge 🧊👀',
        body: "We both know there's nothing good in there. Hot rolls, kebabs, and gravies are ready!",
      },
      {
        id: 'late_2',
        title: 'Binge-watching without snacks? Illegal. 🎬🍿',
        body: 'Put the episode on pause for 20 seconds, order your late-night comfort food, and thank us later.',
      },
      {
        id: 'late_3',
        title: 'Midnight craving check! 🌙🔥',
        body: 'The bhatti is still firing for night owls like you. What are you in the mood for?',
      },
    ],
  },
  {
    id: 'rain_weather',
    name: 'Rainy / Cold Weather in [cityName]',
    triggerDescription: 'Triggered when rain or cold drizzle is detected in the customer’s area.',
    templates: [
      {
        id: 'rain_1',
        title: "It's pouring outside in [cityName]! 🌧️☕",
        body: 'Stay tucked in your blanket. Our rider is on the way with sizzling hot tandoori bites!',
      },
      {
        id: 'rain_2',
        title: 'Rain + hot tandoor = undefeated combo 🌧️🔥',
        body: 'Cold weather demands spicy curries and crispy garlic naan. Tap to order!',
      },
      {
        id: 'rain_3',
        title: 'Cozy weather, zero cooking mood? 🌧️🛋️',
        body: 'Let someone else cook today. Piping hot comfort food heading your way.',
      },
    ],
  },
  {
    id: 'weekend_unwind',
    name: 'Friday Night / Weekend Kickoff (7:30 PM Friday)',
    triggerDescription: 'Triggered Friday evening to celebrate the end of the work week.',
    templates: [
      {
        id: 'weekend_1',
        title: 'The weekend has officially begun! 🥳🎉',
        body: "Log off, put your feet up, and let's get the party started with spicy platters and biryanis.",
      },
      {
        id: 'weekend_2',
        title: 'Friday night dinner plans sorted! 🍢🔥',
        body: 'No cooking, no dishes. Order a proper feast for you and the crew tonight.',
      },
      {
        id: 'weekend_3',
        title: 'You survived Monday to Friday! 🏆',
        body: "Reward yourself tonight. You've earned every single bite of that tandoori platter.",
      },
    ],
  },
  {
    id: 'we_miss_you',
    name: 'Inactivity Check (3 - 7 Days)',
    triggerDescription: 'Triggered when the user has not opened the app or ordered in 3 to 7 days.',
    templates: [
      {
        id: 'miss_1',
        title: 'Did our spices offend you? 💔🥺',
        body: "It's been a few days since we last cooked for you! Here's 15% off to welcome you back.",
      },
      {
        id: 'miss_2',
        title: 'We miss you more than biryani misses raita! 🍚💔',
        body: "Your favorite dishes are asking about you. Open the app to see what's hot today!",
      },
      {
        id: 'miss_3',
        title: 'Forgotten what good food tastes like? 😉',
        body: 'Take a break from basic home meals. Tap to order your favorites with a sweet discount!',
      },
    ],
  },
  {
    id: 'dinner_bell',
    name: 'Dinner Bell (7:45 PM - 8:30 PM)',
    triggerDescription: 'Triggered during prime dinner hours.',
    templates: [
      {
        id: 'dinner_1',
        title: '"What should we eat for dinner?" Solved! 🥘✨',
        body: "Don't waste 30 minutes debating. Order hot bhatti curries and soft rotis right now.",
      },
      {
        id: 'dinner_2',
        title: 'Skip kitchen duty tonight 🍽️',
        body: 'Why cook and do dishes after a long day? Let us handle dinner tonight.',
      },
      {
        id: 'dinner_3',
        title: 'Dinner is calling your name! 🔔',
        body: 'Freshly baked naan, rich gravies, and fragrant rice ready to order. Tap to check out!',
      },
    ],
  },
  {
    id: 'sunday_feast',
    name: 'Sunday Feast / Laziness (Sunday 1:00 PM)',
    triggerDescription: 'Triggered Sunday afternoon when nobody wants to cook.',
    templates: [
      {
        id: 'sunday_1',
        title: 'Sunday rule: Nobody cooks today! 🍗',
        body: 'Sunday afternoons are strictly reserved for big meals and peaceful naps. Order now!',
      },
      {
        id: 'sunday_2',
        title: 'Biryani Sunday is here! 🍚✨',
        body: "There's no better way to spend Sunday than with a steaming pot of dum biryani.",
      },
      {
        id: 'sunday_3',
        title: 'Maximum taste, zero effort Sunday 🛋️',
        body: 'Bring everyone together for a proper meal. Tap to explore family combo deals!',
      },
    ],
  },
  {
    id: 'wallet_cash',
    name: 'Unspent Wallet Balance / Cashback Reminder',
    triggerDescription: 'Triggered when the user has wallet coins sitting idle.',
    templates: [
      {
        id: 'wallet_1',
        title: 'You have unspent cash sitting in your wallet! 💰',
        body: "You've got ₹[walletBalance] waiting to discount your next order. Don't let free savings sit idle!",
      },
      {
        id: 'wallet_2',
        title: 'Free discount alert! 🎁',
        body: 'Pay less on your next meal using your wallet balance. Tap to apply it at checkout!',
      },
      {
        id: 'wallet_3',
        title: 'Why pay full price when you have wallet cash? 🪙',
        body: 'You earned discounts on your previous meals. Put them to good use today!',
      },
    ],
  },
  {
    id: 'group_dawat',
    name: 'Incomplete Group Order / Shared Cart (20 Mins Idle)',
    triggerDescription: 'Triggered when a group order room is inactive without checkout.',
    templates: [
      {
        id: 'group_1',
        title: 'Your friends are waiting on you! 👥🍗',
        body: "Don't be that friend who delays the food order! Confirm your picks so everyone can eat.",
      },
      {
        id: 'group_2',
        title: 'Group hunger level: 100% 🚨',
        body: 'Your shared food room is almost ready. Tap to lock in your items and checkout!',
      },
      {
        id: 'group_3',
        title: "Everyone's food is waiting for your thumbs up 👍",
        body: 'Jump back into the group room so we can fire up the tandoor for the whole gang!',
      },
    ],
  },
];

/**
 * Replaces dynamic placeholders [dishName], [cityName], [walletBalance]
 */
export function interpolateNotificationText(
  text: string,
  params: { dishName?: string; cityName?: string; walletBalance?: number | string }
): string {
  let res = text;
  if (params.dishName) {
    res = res.replace(/\[dishName\]/g, params.dishName);
  } else {
    res = res.replace(/\[dishName\]/g, 'delicious feast');
  }

  if (params.cityName) {
    res = res.replace(/\[cityName\]/g, params.cityName);
  } else {
    res = res.replace(/\[cityName\]/g, 'your city');
  }

  if (params.walletBalance !== undefined) {
    res = res.replace(/\[walletBalance\]/g, String(params.walletBalance));
  } else {
    res = res.replace(/\[walletBalance\]/g, '50');
  }

  return res;
}

class SmartPushService {
  private isNative: boolean;
  private channelCreated: boolean = false;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  /**
   * Initializes notification channels for Android 8.0+
   */
  async initChannels(): Promise<void> {
    if (!this.isNative || this.channelCreated) return;

    try {
      const channel: Channel = {
        id: 'taash_bhatti_smart_pushes',
        name: 'Taash Bhatti Cravings & Offers',
        description: 'Instant updates on hot feasts, cart reminders, and special offers',
        importance: 5, // High importance (shows heads-up notification and lock screen banner)
        visibility: 1, // Visible on lock screen
        vibration: true,
      };

      await LocalNotifications.createChannel(channel);
      this.channelCreated = true;
    } catch (e) {
      console.warn('Could not create notification channel:', e);
    }
  }

  /**
   * Request native and/or web notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (this.isNative) {
      try {
        await this.initChannels();
        const perm = await LocalNotifications.requestPermissions();
        return perm.display === 'granted';
      } catch (e) {
        console.warn('Native notification permission error:', e);
        return false;
      }
    } else {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const res = await Notification.requestPermission();
          return res === 'granted';
        } catch (e) {
          return false;
        }
      }
    }
    return false;
  }

  /**
   * Schedules an Abandoned Cart notification after specified delay (default: 300 seconds = 5 minutes).
   * Automatically replaces [dishName] with the first item in the cart.
   */
  async scheduleAbandonedCartPush(firstDishName: string, delaySeconds: number = 300): Promise<void> {
    const campaign = NOTIFICATION_CAMPAIGNS.find((c) => c.id === 'cart_abandoned')!;
    const randomTemplate = campaign.templates[Math.floor(Math.random() * campaign.templates.length)];

    const title = interpolateNotificationText(randomTemplate.title, { dishName: firstDishName });
    const body = interpolateNotificationText(randomTemplate.body, { dishName: firstDishName });

    // 1. Cancel any existing cart notification first
    await this.cancelAbandonedCartPush();

    const fireAt = new Date(Date.now() + delaySeconds * 1000);

    if (this.isNative) {
      try {
        await this.initChannels();
        const options: ScheduleOptions = {
          notifications: [
            {
              id: NOTIF_IDS.CART_ABANDONED,
              title,
              body,
              schedule: { at: fireAt },
              channelId: 'taash_bhatti_smart_pushes',
              extra: {
                type: 'cart_abandoned',
                dishName: firstDishName,
                templateId: randomTemplate.id,
              },
            },
          ],
        };
        await LocalNotifications.schedule(options);
        console.log(`[SmartPush] Scheduled native abandoned cart notification for ${fireAt.toLocaleTimeString()}`);
      } catch (e) {
        console.warn('Failed to schedule native abandoned cart push:', e);
      }
    } else {
      // Web / Browser fallback via setTimeout + localStorage
      try {
        const timeoutId = window.setTimeout(() => {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' });
          }
        }, delaySeconds * 1000);
        (window as any).__taash_cart_push_timer = timeoutId;
      } catch (e) {}
    }
  }

  /**
   * Instantly cancels pending abandoned cart notification (e.g. user placed order or emptied cart).
   */
  async cancelAbandonedCartPush(): Promise<void> {
    if (this.isNative) {
      try {
        await LocalNotifications.cancel({
          notifications: [{ id: NOTIF_IDS.CART_ABANDONED }],
        });
      } catch (e) {}
    } else {
      if (typeof window !== 'undefined' && (window as any).__taash_cart_push_timer) {
        clearTimeout((window as any).__taash_cart_push_timer);
        (window as any).__taash_cart_push_timer = null;
      }
    }
  }

  /**
   * Instantly test-fires a notification from any of the 10 campaigns on the device lock-screen / notification shade.
   */
  async testFireNotification(
    campaignId: string,
    templateIndex: number = 0,
    params: { dishName?: string; cityName?: string; walletBalance?: number | string } = {}
  ): Promise<{ title: string; body: string }> {
    const campaign = NOTIFICATION_CAMPAIGNS.find((c) => c.id === campaignId) || NOTIFICATION_CAMPAIGNS[0];
    const template = campaign.templates[templateIndex % campaign.templates.length];

    const defaultParams = {
      dishName: params.dishName || 'Chicken Dum Biryani',
      cityName: params.cityName || 'Muzaffarpur',
      walletBalance: params.walletBalance || 120,
    };

    const title = interpolateNotificationText(template.title, defaultParams);
    const body = interpolateNotificationText(template.body, defaultParams);

    if (this.isNative) {
      try {
        await this.initChannels();
        // Schedule 1 second into future for crisp delivery
        await LocalNotifications.schedule({
          notifications: [
            {
              id: NOTIF_IDS.QUICK_TEST,
              title,
              body,
              schedule: { at: new Date(Date.now() + 1000) },
              channelId: 'taash_bhatti_smart_pushes',
              extra: { testCampaign: campaignId },
            },
          ],
        });
      } catch (e) {
        console.warn('Native test fire failed:', e);
      }
    } else {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico' });
        } else {
          Notification.requestPermission().then((res) => {
            if (res === 'granted') {
              new Notification(title, { body, icon: '/favicon.ico' });
            }
          });
        }
      }
    }

    return { title, body };
  }
}

export const smartPushService = new SmartPushService();
