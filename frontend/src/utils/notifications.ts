// Smart notification scheduling.
//
// Strategy: on every app cold-start we fetch today's notification schedule from
// the backend (rule-driven based on the user's current data), cancel any previously
// scheduled items, and schedule the new ones LOCALLY via expo-notifications.
//
// This works in Expo Go (no push token needed) and degrades gracefully on the web
// or on platforms where notifications aren't supported.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { fetchNotificationSchedule } from '@/api/queries';

// AsyncStorage key — used to dedupe across same-day re-runs.
let lastSyncDate: string | null = null;

// iOS / Android sometimes silences notifications fired while the app is foregrounded.
// This handler keeps them visible (banner) when the user is actively using the app.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Sync notifications for today. Safe to call on every app open — bails out early
 * if we already synced today. Returns the number of notifications scheduled
 * (useful for debugging in the dev menu / logs).
 */
export async function syncNotifications(userId: number, opts?: { force?: boolean }): Promise<number> {
  if (Platform.OS === 'web') return 0;

  const today = new Date().toISOString().slice(0, 10);
  if (!opts?.force && lastSyncDate === today) {
    return 0; // already done in this app session today
  }

  // 1) Permission
  const perm = await Notifications.getPermissionsAsync();
  let granted = perm.granted || perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  }
  if (!granted) return 0;

  // 2) Fetch today's schedule from backend
  let schedule;
  try {
    schedule = await fetchNotificationSchedule(userId);
  } catch (err) {
    if (__DEV__) console.warn('[notifications] schedule fetch failed', err);
    return 0;
  }
  if (!schedule?.items?.length) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    lastSyncDate = today;
    return 0;
  }

  // 3) Clear all previous, schedule new
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  let scheduled = 0;
  for (const item of schedule.items) {
    const fireAt = new Date();
    fireAt.setHours(item.hour, item.minute, 0, 0);
    if (fireAt <= now) continue; // already passed (server should filter, but double-check)

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: item.title,
          body: item.body,
          data: { tag: item.tag },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
        },
      });
      scheduled++;
    } catch (err) {
      if (__DEV__) console.warn('[notifications] schedule failed for', item.tag, err);
    }
  }

  lastSyncDate = today;
  return scheduled;
}

/**
 * Resets the in-memory "last synced today" flag so the next syncNotifications call
 * re-runs. Use after the user logs out, regenerates their plan, or any other event
 * that meaningfully changes the day's notification content.
 */
export function invalidateNotificationSync() {
  lastSyncDate = null;
}
