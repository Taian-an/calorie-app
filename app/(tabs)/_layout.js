import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/PreferencesContext';

export default function TabLayout() {
  const { t } = useLanguage();
  const { C } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopWidth: 1,
          borderTopColor: C.muted,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
        headerStyle: { backgroundColor: C.bg },
        headerTintColor: C.textPrimary,
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.diaryTitle,
          tabBarLabel: t.tabHome,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t.dailyTracking,
          tabBarLabel: t.tabProgress,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: t.aiCoachTitle,
          tabBarLabel: t.tabCoach,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabProfile,
          tabBarLabel: t.tabProfile,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      {/* 相機不佔分頁，由餐次 + 按鈕進入 */}
      <Tabs.Screen
        name="camera"
        options={{
          href: null,
          title: t.appTitle,
        }}
      />
      {/* 條碼掃描同樣不佔分頁，由餐次 + 按鈕進入 */}
      <Tabs.Screen
        name="barcode"
        options={{
          href: null,
          title: t.barcodeScanOption,
        }}
      />
    </Tabs>
  );
}
