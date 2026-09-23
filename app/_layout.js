import { Stack } from 'expo-router';
import { LanguageProvider } from '../context/LanguageContext';
import { UserDataProvider, useUserData } from '../context/UserDataContext';

// 登入是進 App 的第一道關卡，引導問卷是第二道：
// 未登入 → login/register；登入但還沒填過身體資料（profile.height 是 null）→ onboarding；都完成才看得到 (tabs)。
function RootNavigator() {
  const { loaded, authEmail, profile } = useUserData();
  if (!loaded) return null;
  const onboarded = profile?.height != null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!authEmail && onboarded}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!!authEmail && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!authEmail}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <UserDataProvider>
      <LanguageProvider>
        <RootNavigator />
      </LanguageProvider>
    </UserDataProvider>
  );
}
