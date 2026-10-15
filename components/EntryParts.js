import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences, useStyles } from '../context/PreferencesContext';
import { useUserData } from '../context/UserDataContext';

// 食物詳情頁（app/entry.js）和更多營養素頁（app/entry-nutrition.js）共用：
// 從網址的 date（Day）和 time（Entry 的識別）找出那筆 Entry，以及頁面頂端的返回列
export function useEntry() {
  const { date, time } = useLocalSearchParams();
  const { dailyLogs, updateMeal } = useUserData();
  const t = Number(time);
  const entry = dailyLogs[date]?.meals?.find(m => m.time === t) ?? null;
  return { date, time: t, entry, update: (patch) => updateMeal(date, t, patch) };
}

export function EntryHeader({ title }) {
  const { C } = usePreferences();
  const s = useStyles(makeStyles);
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={10}>
        <Ionicons name="chevron-back" size={26} color={C.textPrimary} />
      </TouchableOpacity>
      <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ width: 26 }} />
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '900', color: C.textPrimary, textAlign: 'center' },
});
