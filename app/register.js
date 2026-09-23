import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';
import { useUserData } from '../context/UserDataContext';
import GoogleAuthButton, { GOOGLE_LOGIN_ENABLED } from '../components/GoogleAuthButton';

const C = {
  primary:       '#22C55E',
  primaryDark:   '#16A34A',
  bg:            '#F0FDF4',
  textPrimary:   '#14532D',
  textSecondary: '#6B7280',
  border:        '#D1D5DB',
  required:      '#EF4444',
};

// 從 login.js 的「Sign Up」連結進來。註冊成功後跟登入一樣直接放行到 (tabs)。
export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { register } = useUserData();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleRegister = async () => {
    if (!email.trim() || !username.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      const name = `${firstName.trim()} ${lastName.trim()}`.trim();
      await register(email, username, password, name);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err.response?.data?.error ?? t.authFailed);
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
          <Text style={s.title}>建立帳號</Text>

          <View style={s.row}>
            <View style={s.rowItem}>
              <Text style={s.label}>First Name</Text>
              <TextInput
                style={s.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholderTextColor={C.textSecondary}
                autoCorrect={false}
              />
            </View>
            <View style={s.rowItem}>
              <Text style={s.label}>Last Name</Text>
              <TextInput
                style={s.input}
                value={lastName}
                onChangeText={setLastName}
                placeholderTextColor={C.textSecondary}
                autoCorrect={false}
              />
            </View>
          </View>

          <Text style={s.label}>Email<Text style={s.req}> *</Text></Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholderTextColor={C.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <Text style={s.label}>使用者名稱<Text style={s.req}> *</Text></Text>
          <TextInput
            style={s.input}
            value={username}
            onChangeText={setUsername}
            placeholderTextColor={C.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
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
                <Text style={s.dividerText}>或</Text>
                <View style={s.dividerLine} />
              </View>
              <View style={{ marginBottom: 14 }}>
                <GoogleAuthButton onError={setError} />
              </View>
            </>
          )}

          {error && <Text style={s.error}>{error}</Text>}

          <TouchableOpacity
            style={[s.btn, busy && { opacity: 0.5 }]}
            onPress={handleRegister}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Text style={s.btnText}>{busy ? '…' : t.registerBtn}</Text>
          </TouchableOpacity>

          <View style={s.footerRow}>
            <Text style={s.footerText}>已經有帳號了？</Text>
            <TouchableOpacity onPress={() => router.replace('/login')} activeOpacity={0.7}>
              <Text style={s.footerLink}>{t.loginBtn}</Text>
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

  title: { fontSize: 26, fontWeight: '900', color: C.textPrimary, marginBottom: 20 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 12.5, fontWeight: '600', color: C.textSecondary },

  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },

  label: { fontSize: 13, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  req:   { color: C.required },

  input: {
    width: '100%', borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    paddingVertical: 13, paddingHorizontal: 14, marginBottom: 18,
    fontSize: 15, fontWeight: '500', color: C.textPrimary, backgroundColor: '#FFF',
  },

  error: { fontSize: 12, color: '#DC2626', marginTop: -6, marginBottom: 12 },

  btn: {
    marginTop: 6, borderRadius: 12, paddingVertical: 15, alignItems: 'center',
    backgroundColor: C.primary,
  },
  btnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },

  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22, gap: 6 },
  footerText: { fontSize: 13.5, color: C.textSecondary },
  footerLink: { fontSize: 13.5, fontWeight: '700', color: C.primaryDark },
});
