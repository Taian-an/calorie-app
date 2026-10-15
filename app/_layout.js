// 要最先載入：趁路由還沒把網址 #id_token 改掉之前讀取（見檔案內說明）
import '../components/googleRedirectLogin';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LanguageProvider } from '../context/LanguageContext';
import { UserDataProvider, useUserData } from '../context/UserDataContext';
import { PreferencesProvider, useTheme } from '../context/PreferencesContext';
import NotificationScheduler from '../components/NotificationScheduler';

// 登入是進 App 的第一道關卡，引導問卷是第二道：
// 未登入 → login/register；登入但還沒填過身體資料（profile.height 是 null）→ onboarding；都完成才看得到 (tabs)。
function RootNavigator() {
  const { loaded, authEmail, profile } = useUserData();
  const { C, scheme } = useTheme();
  if (!loaded) return null;
  const onboarded = profile?.height != null;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <NotificationScheduler />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Protected guard={!!authEmail && onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="entry" />
          <Stack.Screen name="entry-nutrition" />
        </Stack.Protected>
        <Stack.Protected guard={!!authEmail && !onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!authEmail}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <UserDataProvider>
      <LanguageProvider>
        <PreferencesProvider>
          <RootNavigator />
        </PreferencesProvider>
      </LanguageProvider>
    </UserDataProvider>
  );
}
