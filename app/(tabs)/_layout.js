import { Tabs } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/PreferencesContext';
import { AddFoodProvider, useAddFood } from '../../components/AddFoodSheet';

// 導覽列正中間、往上凸出一半的相機鈕：打開「新增食物」選單，不先指定餐次（分析完再選）
function AddFoodTabButton() {
  const { C } = useTheme();
  const { t } = useLanguage();
  const { open } = useAddFood();
  return (
    <View style={s.addSlot} pointerEvents="box-none">
      <TouchableOpacity
        style={[s.addBtn, { backgroundColor: C.primary, borderColor: C.card, shadowColor: C.primaryDark }]}
        onPress={() => open()}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t.addFoodTitle}
      >
        <Ionicons name="camera-outline" size={28} color={C.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  return (
    <AddFoodProvider>
      <TabNavigator />
    </AddFoodProvider>
  );
}

function TabNavigator() {
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
        name="add"
        options={{
          title: t.addFoodTitle,
          tabBarButton: () => <AddFoodTabButton />,
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

const s = StyleSheet.create({
  addSlot: { flex: 1, alignItems: 'center' },
  addBtn: {
    width: 62, height: 62, borderRadius: 31, marginTop: -39, // 導覽列有 8 的上內距，再往上 31 讓按鈕中心剛好壓在導覽列上緣
    alignItems: 'center', justifyContent: 'center', borderWidth: 4,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
});
