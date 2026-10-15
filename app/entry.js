import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, ScrollView, SafeAreaView, StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { usePreferences, useStyles } from '../context/PreferencesContext';
import MealPicker from '../components/MealPicker';
import { EntryHeader, useEntry } from '../components/EntryParts';
import { scaleEntry, entryPhotoUri, GRAMS_PER_OZ } from '../constants/nutrition';

const round1 = v => Math.round(v * 10) / 10;

// 一筆已記錄的食物（Entry）的詳細頁：從日誌點進來，網址帶 date（Day）和 time（Entry 的識別）。
// 名稱、份量、餐次改的是草稿，畫面上的熱量和營養素會跟著份量等比例預覽；按底部的「儲存」才寫進日誌並回上一頁
export default function EntryScreen() {
  const { lang, t } = useLanguage();
  const { C, units } = usePreferences();
  const s = useStyles(makeStyles);
  const { date, time, entry, update } = useEntry();

  const byGrams = entry?.grams > 0;
  const imperial = units === 'imperial';
  const servingText = (e) => {
    if (!e) return '';
    if (e.grams > 0) return String(imperial ? round1(e.grams / GRAMS_PER_OZ) : Math.round(e.grams));
    return String(e.servings ?? 1);
  };

  const [name, setName] = useState(entry?.name ?? '');
  const [serving, setServing] = useState(servingText(entry));
  const [mealType, setMealType] = useState(entry?.mealType ?? 'snacks');
  // 換了一筆、或在別處（例如雲端同步）改過時，草稿跟著更新
  useEffect(() => { setName(entry?.name ?? ''); }, [entry?.name]);
  useEffect(() => { setServing(servingText(entry)); }, [entry?.grams, entry?.servings, units]);
  useEffect(() => { setMealType(entry?.mealType ?? 'snacks'); }, [entry?.mealType]);

  if (!entry) {
    return (
      <SafeAreaView style={s.safe}>
        <EntryHeader title={t.entryTitle} />
        <Text style={s.notFound}>{t.entryNotFound}</Text>
      </SafeAreaView>
    );
  }

  // 草稿份量是原本的幾倍；輸入不合法（空的、0）時當作沒改
  const servingValue = parseFloat(serving);
  const factor = (() => {
    if (!(servingValue > 0)) return 1;
    const current = byGrams ? entry.grams : (entry.servings ?? 1);
    const next = byGrams ? (imperial ? servingValue * GRAMS_PER_OZ : servingValue) : servingValue;
    const f = next / current;
    return Math.abs(f - 1) < 1e-6 ? 1 : f;
  })();
  const preview = factor === 1 ? entry : { ...entry, ...scaleEntry(entry, factor) };

  const save = () => {
    const patch = {};
    const trimmed = name.trim();
    if (trimmed && trimmed !== entry.name) patch.name = trimmed;
    if (factor !== 1) Object.assign(patch, scaleEntry(entry, factor));
    if (mealType !== entry.mealType) patch.mealType = mealType;
    if (Object.keys(patch).length) update(patch);
    router.canGoBack() ? router.back() : router.replace('/');
  };

  const photo = entryPhotoUri(entry);
  const loggedAt = new Date(entry.time).toLocaleString(lang === 'zh' ? 'zh-TW' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
  const servingUnit = byGrams ? (imperial ? 'oz' : 'g') : t.entryServingsUnit;

  return (
    <SafeAreaView style={s.safe}>
      <EntryHeader title={t.entryTitle} />
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {photo ? (
          <Image source={{ uri: photo }} style={s.photo} resizeMode="cover" />
        ) : (
          <View style={[s.photo, s.photoEmpty]}>
            <Ionicons name="restaurant-outline" size={44} color={C.textMuted} />
          </View>
        )}

        <View style={s.card}>
          <Text style={s.label}>{t.entryName}</Text>
          <TextInput
            style={s.nameInput}
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            maxLength={80}
          />

          <View style={s.divider} />

          <Text style={s.label}>{t.entryServing}</Text>
          <View style={s.servingRow}>
            <TextInput
              style={s.servingInput}
              value={serving}
              onChangeText={txt => setServing(txt.replace(/[^0-9.]/g, ''))}
              onBlur={() => { if (!(parseFloat(serving) > 0)) setServing(servingText(entry)); }}
              keyboardType="decimal-pad"
              returnKeyType="done"
              selectTextOnFocus
            />
            <Text style={s.servingUnit}>{servingUnit}</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>{t.entryNutrition}</Text>
          <View style={s.kcalRow}>
            <Text style={s.kcal}>{Math.round(preview.energy || 0)}</Text>
            <Text style={s.kcalUnit}>kcal</Text>
          </View>
          <View style={s.macroRow}>
            {[
              { key: 'protein', label: t.proteinShort, color: C.macroProtein },
              { key: 'carbs', label: t.carbsShort, color: C.macroCarbs },
              { key: 'fat', label: t.fatShort, color: C.macroFat },
            ].map(m => (
              <View key={m.key} style={s.macroBox}>
                <Text style={[s.macroVal, { color: m.color }]}>{round1(preview[m.key] || 0)} g</Text>
                <Text style={s.macroLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={s.moreRow}
            onPress={() => router.push({ pathname: '/entry-nutrition', params: { date, time: String(time), factor: String(factor) } })}
            activeOpacity={0.7}
          >
            <Text style={s.moreText}>{t.entryMoreNutrition}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <View style={s.infoRow}>
            <Text style={s.label}>{t.entryLoggedAt}</Text>
            <Text style={s.infoValue}>{loggedAt}</Text>
          </View>
          <View style={s.divider} />
          <Text style={s.label}>{t.entryCategory}</Text>
          {/* 存檔後日誌頁會自動把這筆排到新的餐次底下 */}
          <MealPicker value={mealType} onChange={setMealType} t={t} />
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.saveBtn} onPress={save} activeOpacity={0.85}>
          <Text style={s.saveBtnText}>{t.saveLabel}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  body: { paddingHorizontal: 18, paddingBottom: 40 },
  notFound: { fontSize: 15, color: C.textSecondary, textAlign: 'center', marginTop: 60, paddingHorizontal: 32 },

  photo: { width: '55%', maxWidth: 240, aspectRatio: 1, alignSelf: 'center', borderRadius: 20, backgroundColor: C.muted, marginBottom: 16 },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: C.card, borderRadius: 18, padding: 16, marginBottom: 14,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.textPrimary, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '700', color: C.textSecondary, marginBottom: 6 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },

  nameInput: {
    fontSize: 17, fontWeight: '800', color: C.textPrimary, paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
  },
  servingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  servingInput: {
    minWidth: 100, fontSize: 20, fontWeight: '800', color: C.textPrimary, textAlign: 'center',
    paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1.5, borderColor: C.primary, borderRadius: 12,
  },
  servingUnit: { fontSize: 15, fontWeight: '700', color: C.textSecondary },

  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 12 },
  kcal: { fontSize: 36, fontWeight: '900', color: C.primaryDark },
  kcalUnit: { fontSize: 14, fontWeight: '700', color: C.textSecondary },
  macroRow: { flexDirection: 'row', gap: 10 },
  macroBox: { flex: 1, backgroundColor: C.subtle, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  macroVal: { fontSize: 16, fontWeight: '900' },
  macroLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginTop: 2 },
  moreRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border,
  },
  moreText: { fontSize: 14, fontWeight: '700', color: C.primaryDark },

  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoValue: { fontSize: 14, fontWeight: '700', color: C.textPrimary },

  footer: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
  saveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: C.primary },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: C.onPrimary },
});
