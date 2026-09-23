import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, FlatList, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { useCallback, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useUserData } from '../../context/UserDataContext';

const C = {
  primary:       '#22C55E',
  bg:            '#F0FDF4',
  card:          '#FFFFFF',
  textPrimary:   '#14532D',
  textSecondary: '#6B7280',
  border:        '#E5E7EB',
  bubbleUser:    '#22C55E',
  bubbleModel:   '#FFFFFF',
  danger:        '#DC2626',
};

let uid = 0;
const nextId = () => `${Date.now()}-${uid++}`;

export default function CoachScreen() {
  const { t } = useLanguage();
  const { sendCoachMessage } = useUserData();
  const [messages, setMessages] = useState(() => [
    { id: nextId(), role: 'model', text: t.coachGreeting },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg = { id: nextId(), role: 'user', text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setSending(true);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));

    try {
      const reply = await sendCoachMessage(history.map(({ role, text }) => ({ role, text })));
      setMessages(prev => [...prev, { id: nextId(), role: 'model', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { id: nextId(), role: 'model', text: t.coachError, isError: true }]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [input, sending, messages, sendCoachMessage, t.coachError]);

  const handleClear = useCallback(() => {
    setMessages([{ id: nextId(), role: 'model', text: t.coachGreeting }]);
  }, [t.coachGreeting]);

  const renderItem = ({ item }) => (
    <View style={[s.row, item.role === 'user' ? s.rowUser : s.rowModel]}>
      <View
        style={[
          s.bubble,
          item.role === 'user' ? s.bubbleUser : s.bubbleModel,
          item.isError && s.bubbleErrorBorder,
        ]}
      >
        <Text style={item.role === 'user' ? s.bubbleTextUser : s.bubbleTextModel}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerEmoji}>🤖</Text>
          <Text style={s.headerTitle}>{t.aiCoachTitle}</Text>
        </View>
        <TouchableOpacity onPress={handleClear} hitSlop={10}>
          <Ionicons name="refresh-outline" size={20} color={C.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {sending && (
          <View style={s.typingRow}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={s.typingText}>{t.coachThinking}</Text>
          </View>
        )}

        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder={t.coachInputPlaceholder}
            placeholderTextColor={C.textSecondary}
            multiline
            editable={!sending}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || sending) && s.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerEmoji: { fontSize: 22 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: C.textPrimary },
  list: { padding: 16, gap: 10 },
  row: { flexDirection: 'row' },
  rowUser: { justifyContent: 'flex-end' },
  rowModel: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: C.bubbleUser, borderBottomRightRadius: 4 },
  bubbleModel: {
    backgroundColor: C.bubbleModel, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: C.border,
  },
  bubbleErrorBorder: { borderColor: C.danger },
  bubbleTextUser: { color: '#FFFFFF', fontSize: 15, lineHeight: 21 },
  bubbleTextModel: { color: C.textPrimary, fontSize: 15, lineHeight: 21 },
  typingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingBottom: 6,
  },
  typingText: { fontSize: 12, color: C.textSecondary },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.card,
  },
  input: {
    flex: 1, maxHeight: 100, fontSize: 15, color: C.textPrimary,
    backgroundColor: C.bg, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: C.border,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: C.border },
});
