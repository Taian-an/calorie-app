import { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import { useUserData } from '../context/UserDataContext';
import { useLanguage } from '../context/LanguageContext';
import { authErrorMessage } from '../constants/authErrors';

// 彈出視窗導回時的交還（以及手機瀏覽器交還失敗時的備援）統一在 googleRedirectLogin 處理
import './googleRedirectLogin';

// 還沒去 Google Cloud Console 申請對應平台的 Client ID 前，Google.useIdTokenAuthRequest 一旦被呼叫就會
// 直接 throw，所以由呼叫端（login.js / register.js）用這個旗標決定要不要 mount 這個元件，避免把整頁弄壞。
// 一定要照「目前實際跑的平台」檢查對應的 client id——原生 Android/iOS App 分別強制要求
// androidClientId/iosClientId 要有值，光有 webClientId 只夠網頁版用，這裡誤判會導致原生 App 上
// 一進登入頁就整個 crash（曾經發生過：本機測 Android 版時登出後跳回登入頁直接紅屏當機）。
export const GOOGLE_LOGIN_ENABLED = Platform.select({
  android: !!process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  ios:     !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  default: !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

// 登入頁、註冊頁共用的「通過 Google 繼續」按鈕：
// 拿到 Google 的 id_token 後直接丟給後端 /auth/google，帳號不存在就自動建立，等同一鍵完成登入或註冊。
export default function GoogleAuthButton({ onError }) {
  const router = useRouter();
  const { loginWithGoogle } = useUserData();
  const { t } = useLanguage();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId:      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId:      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId:  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    // 原生 App 預設會導回 Google 那組 com.googleusercontent.apps.xxx 反向網域 scheme，
    // 但我們的 AndroidManifest 只註冊了自己的 calorie-app:// scheme，導致登入完成後系統找不到
    // 對應的 App、卡在 Chrome 裡出不來。明確指定導回自己的 scheme（Android Client 要記得在
    // Google Console 開「Enable Custom URI scheme」才會接受非官方反向網域格式的導回網址）。
    // iOS 不能照抄：Google 的 iOS Client 只接受「Bundle ID」或「反向 Client ID」當 scheme，
    // 用 calorie-app:// 會直接被拒（redirect_uri_mismatch）。Bundle ID 這組 scheme 已經註冊在 Info.plist 裡。
    redirectUri: Platform.OS === 'ios'
      ? AuthSession.makeRedirectUri({ native: 'com.taianan.calorieapp:/oauthredirect' })
      : AuthSession.makeRedirectUri({ scheme: 'calorie-app' }),
  });

  useEffect(() => {
    if (!response || response.type === 'dismiss' || response.type === 'cancel') return;
    if (response.type === 'error') {
      console.error('[google login] auth error:', response.error, response.params);
      // Google 回傳的 error_description 是英文，而且是給開發者看的；使用者看翻譯過的訊息就好
      onError?.(t.googleDenied);
      return;
    }
    if (response.type !== 'success') return;
    loginWithGoogle(response.params.id_token)
      .then(() => router.replace('/(tabs)'))
      .catch(err => {
        console.error('[google login] backend call failed:', err);
        onError?.(authErrorMessage(err, t, 'googleFailed'));
      });
  }, [response]);

  return (
    <TouchableOpacity
      style={[s.btn, { outlineStyle: 'none' }]}
      onPress={() => promptAsync()}
      disabled={!request}
      activeOpacity={0.85}
    >
      <AntDesign name="google" size={17} color="#4285F4" />
      <Text style={s.text}>{t.googleContinue}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 12,
    paddingVertical: 13, backgroundColor: '#FFF',
  },
  text: { fontSize: 14.5, fontWeight: '700', color: '#1F2937' },
});
