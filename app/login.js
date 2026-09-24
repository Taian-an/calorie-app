import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  ScrollView, Alert,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';
import { useUserData } from '../context/UserDataContext';
import GoogleAuthButton, { GOOGLE_LOGIN_ENABLED } from '../components/GoogleAuthButton';
import { authErrorMessage } from '../constants/authErrors';
import { takePendingGoogleIdToken } from '../components/googleRedirectLogin';

const C = {
  primary:       '#22C55E',
  primaryDark:   '#16A34A',
  bg:            '#F0FDF4',
  textPrimary:   '#14532D',
  textSecondary: '#6B7280',
  border:        '#D1D5DB',
  required:      '#EF4444',
};

// 進 App 的強制關卡：未登入只會看到這頁，登入成功才放行到 (tabs)。
// 沒有帳號就走下面的「Sign Up」連結去 /register。
export default function LoginScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { login, loginWithGoogle } = useUserData();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // 手機瀏覽器 Google 登入的備援：這個分頁是 Google 驗證完導回來的，但沒辦法交還給原本的分頁，
  // 就在這裡直接用拿到的 token 登入。成功後登入狀態一變，_layout 的路由守衛會自動帶進 App
  useEffect(() => {
    const idToken = takePendingGoogleIdToken();
    if (!idToken) return;
    setBusy(true);
    loginWithGoogle(idToken)
      .catch(err => setError(authErrorMessage(err, t, 'googleFailed')))
      .finally(() => setBusy(false));
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (err) {
      setError(authErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>{t.loginWelcome}</Text>
          <Text style={s.subtitle}>{t.loginWelcomeSub}</Text>

          <Text style={s.label}>{t.emailLabel}<Text style={s.req}> *</Text></Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholderTextColor={C.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <Text style={s.label}>{t.passwordLabel}<Text style={s.req}> *</Text></Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholderTextColor={C.textSecondary}
            secureTextEntry
          />

          {GOOGLE_LOGIN_ENABLED && (
            <>
              <View style={s.dividerRow}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>{t.orDivider}</Text>
                <View style={s.dividerLine} />
              </View>
              <View style={{ marginBottom: 14 }}>
                <GoogleAuthButton onError={setError} />
              </View>
            </>
          )}

          <TouchableOpacity
            onPress={() => Alert.alert(t.camNotice, t.forgotPasswordUnavailable)}
            activeOpacity={0.7}
            style={[s.forgotWrap, GOOGLE_LOGIN_ENABLED && { marginTop: 0 }]}
          >
            <Text style={s.forgot}>{t.forgotPassword}</Text>
          </TouchableOpacity>

          {error && <Text style={s.error}>{error}</Text>}

          <TouchableOpacity
            style={[s.btn, busy && { opacity: 0.5 }]}
            onPress={handleLogin}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Text style={s.btnText}>{busy ? '…' : t.loginBtn}</Text>
          </TouchableOpacity>

          <View style={s.footerRow}>
            <Text style={s.footerText}>{t.noAccount}</Text>
            <TouchableOpacity onPress={() => router.push('/register')} activeOpacity={0.7}>
              <Text style={s.footerLink}>{t.signUpLink}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },

  title:    { fontSize: 26, fontWeight: '900', color: C.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, fontWeight: '500', color: C.textSecondary, marginBottom: 24 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 12.5, fontWeight: '600', color: C.textSecondary },

  label: { fontSize: 13, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  req:   { color: C.required },

  input: {
    width: '100%', borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    paddingVertical: 13, paddingHorizontal: 14, marginBottom: 18,
    fontSize: 15, fontWeight: '500', color: C.textPrimary, backgroundColor: '#FFF',
  },

  forgotWrap: { alignSelf: 'flex-start', marginBottom: 4, marginTop: -6 },
  forgot: { fontSize: 13, fontWeight: '600', color: C.primaryDark },

  error: { fontSize: 12, color: '#DC2626', marginTop: 10, marginBottom: 2 },

  btn: {
    marginTop: 22, borderRadius: 12, paddingVertical: 15, alignItems: 'center',
    backgroundColor: C.primary,
  },
  btnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },

  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22, gap: 6 },
  footerText: { fontSize: 13.5, color: C.textSecondary },
  footerLink: { fontSize: 13.5, fontWeight: '700', color: C.primaryDark },
});
