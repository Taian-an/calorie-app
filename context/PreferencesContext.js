import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PALETTES, THEME_KEYS } from '../constants/theme';
import { UNIT_KEYS } from '../constants/units';

// 這台裝置的 App 偏好：外觀、單位、通知。跟語言一樣存在裝置上（AsyncStorage），登出也不清掉
const PREFS_KEY = '@calorie_app_prefs';

export const NOTIFY_TYPES = ['foodLog', 'dailySummary', 'weightLog', 'goalReached', 'appUpdates'];

const DEFAULT_PREFS = {
  appearance: 'system', // 'light' | 'dark' | 'system'
  units: 'metric',      // 'metric' | 'imperial'
  notifications: {
    enabled: false,
    foodLog: true, dailySummary: false, weightLog: true, goalReached: true, appUpdates: true,
  },
};

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const systemScheme = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then(raw => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        setPrefs(prev => ({
          appearance: THEME_KEYS.includes(saved.appearance) ? saved.appearance : prev.appearance,
          units: UNIT_KEYS.includes(saved.units) ? saved.units : prev.units,
          notifications: { ...prev.notifications, ...(saved.notifications ?? {}) },
        }));
      })
      .catch(() => {});
  }, []);

  const update = useCallback((patch) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setAppearance = useCallback((appearance) => update({ appearance }), [update]);
  const setUnits = useCallback((units) => update({ units }), [update]);
  const setNotification = useCallback((key, on) => {
    setPrefs(prev => {
      const next = { ...prev, notifications: { ...prev.notifications, [key]: on } };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const scheme = prefs.appearance === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : prefs.appearance;

  const value = useMemo(() => ({
    ...prefs,
    scheme,
    C: PALETTES[scheme],
    setAppearance,
    setUnits,
    setNotification,
  }), [prefs, scheme, setAppearance, setUnits, setNotification]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}

// 目前的配色（C）與 'light' | 'dark'
export function useTheme() {
  const { C, scheme } = usePreferences();
  return { C, scheme };
}

// 每個畫面把樣式寫成 makeStyles(C) => StyleSheet.create({...})，換配色時才重建
export function useStyles(makeStyles) {
  const { C } = usePreferences();
  return useMemo(() => makeStyles(C), [makeStyles, C]);
}
