import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { usePreferences } from '../context/PreferencesContext';
import { useUserData, dateKey } from '../context/UserDataContext';

// 依「設定 → 通知」的開關排程本機通知（不經過後端推播）。畫面上不顯示任何東西，掛在 _layout 裡就好。
// 網頁版 expo-notifications 不支援排程，整個元件直接不做事。
const CHANNEL_ID = 'reminders';
const GOAL_NOTIFIED_KEY = '@calorie_app_goal_notified'; // 最後一次發「達成目標」通知的 Day，一天只發一次
const LAST_VERSION_KEY = '@calorie_app_last_version';  // 上次開 App 時的版本，用來判斷剛更新過

const MEAL_REMINDERS = [
  { meal: 'breakfast', hour: 8,  minute: 30 },
  { meal: 'lunch',     hour: 12, minute: 30 },
  { meal: 'dinner',    hour: 18, minute: 30 },
];
const WEIGH_IN = { hour: 8, minute: 0 };
const SUMMARY = { hour: 21, minute: 0 };
const SUMMARY_DAYS_AHEAD = 7; // 每日總結用單次排程：今天帶實際數字，之後幾天是通用文字，每次開 App 重排

const enabledOnDevice = Platform.OS !== 'web';

if (enabledOnDevice) {
  // App 開著的時候（例如剛記完一餐就達標）也要跳出通知
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
    }),
  });
}

const daily = (hour, minute) => ({
  type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_ID,
});
const at = (date) => ({
  type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID,
});

async function ensurePermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

function summaryBody(t, eaten, target) {
  if (!eaten) return t.nSummaryEmpty;
  if (target == null) return t.nSummaryNoTarget.replace('{eaten}', eaten);
  const diff = target - eaten;
  return t.nSummaryBody
    .replace('{eaten}', eaten)
    .replace('{target}', target)
    .replace('{diff}', (diff >= 0 ? t.nSummaryLeft : t.nSummaryOver).replace('{n}', Math.abs(diff)));
}

async function scheduleAll({ prefs, t, eatenToday, target }) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!prefs.enabled) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: t.notifyChannel, importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const jobs = [];
  if (prefs.foodLog) {
    for (const r of MEAL_REMINDERS) {
      jobs.push({
        identifier: `foodLog-${r.meal}`,
        content: { title: t.nFoodTitle.replace('{meal}', t[r.meal]), body: t.nFoodBody },
        trigger: daily(r.hour, r.minute),
      });
    }
  }
  if (prefs.weightLog) {
    jobs.push({
      identifier: 'weightLog',
      content: { title: t.nWeightTitle, body: t.nWeightBody },
      trigger: daily(WEIGH_IN.hour, WEIGH_IN.minute),
    });
  }
  if (prefs.dailySummary) {
    const now = new Date();
    for (let i = 0; i < SUMMARY_DAYS_AHEAD; i++) {
      const when = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, SUMMARY.hour, SUMMARY.minute);
      if (when <= now) continue;
      jobs.push({
        identifier: `dailySummary-${i}`,
        content: { title: t.nSummaryTitle, body: i === 0 ? summaryBody(t, eatenToday, target) : t.nSummaryGeneric },
        trigger: at(when),
      });
    }
  }
  await Promise.all(jobs.map(job => Notifications.scheduleNotificationAsync(job)));
}

export default function NotificationScheduler() {
  const { t } = useLanguage();
  const { notifications: prefs, setNotification, loaded: prefsLoaded } = usePreferences();
  const { profile, getDayTotals, authEmail } = useUserData();

  const todayKey = dateKey();
  const eatenToday = Math.round(getDayTotals(todayKey)?.energy ?? 0);
  const target = profile?.target != null ? Math.round(profile.target) : null;
  const signedIn = !!authEmail;

  // 排程一次接一次跑，避免快速切開關時兩次 cancel/schedule 交錯
  const queue = useRef(Promise.resolve());

  // 開關、語言或今天的熱量一變，就整批重排（全部是本機排程，重排很便宜）
  useEffect(() => {
    if (!enabledOnDevice || !prefsLoaded) return;
    queue.current = queue.current.then(async () => {
      const active = { ...prefs, enabled: prefs.enabled && signedIn };
      if (active.enabled && !(await ensurePermission())) {
        setNotification('enabled', false);
        Alert.alert(t.setNotify, t.notifyDenied);
        return;
      }
      await scheduleAll({ prefs: active, t, eatenToday, target });
    }).catch(err => console.warn('[notifications] schedule failed:', err.message));
  }, [prefs, prefsLoaded, t, eatenToday, target, signedIn, setNotification]);

  // 達成目標：今天吃到目標熱量的那一刻跳一次（一個 Day 只發一次）
  useEffect(() => {
    if (!enabledOnDevice || !signedIn || !prefs.enabled || !prefs.goalReached) return;
    if (target == null || eatenToday < target) return;
    (async () => {
      if ((await AsyncStorage.getItem(GOAL_NOTIFIED_KEY)) === todayKey) return;
      await AsyncStorage.setItem(GOAL_NOTIFIED_KEY, todayKey);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t.nGoalTitle,
          body: t.nGoalBody.replace('{eaten}', eatenToday).replace('{target}', target),
        },
        trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
      });
    })().catch(err => console.warn('[notifications] goal failed:', err.message));
  }, [eatenToday, target, todayKey, signedIn, prefs.enabled, prefs.goalReached, t]);

  // App 更新：這次開啟的版本跟上次不同就通知一次（第一次安裝只記下版本）
  const checkedVersion = useRef(false);
  useEffect(() => {
    if (!enabledOnDevice || !prefsLoaded || checkedVersion.current) return;
    checkedVersion.current = true;
    const version = Constants.expoConfig?.version;
    if (!version) return;
    (async () => {
      const last = await AsyncStorage.getItem(LAST_VERSION_KEY);
      await AsyncStorage.setItem(LAST_VERSION_KEY, version);
      if (!last || last === version || !prefs.enabled || !prefs.appUpdates) return;
      await Notifications.scheduleNotificationAsync({
        content: { title: t.nUpdateTitle, body: t.nUpdateBody.replace('{v}', version) },
        trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
      });
    })().catch(err => console.warn('[notifications] update check failed:', err.message));
    // 偏好載入後、App 啟動時只檢查一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsLoaded]);

  return null;
}
