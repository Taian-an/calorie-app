import { View, Text, ScrollView, SafeAreaView, StyleSheet } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useStyles } from '../context/PreferencesContext';
import { MICRO_UNITS } from '../constants/nutrition';
import { EntryHeader, useEntry } from '../components/EntryParts';

const round1 = v => Math.round(v * 10) / 10;

// 一筆 Entry 的完整營養素：三大營養素之外的纖維、糖、鈉等（目前份量下的數值）。沒有資料的顯示「—」
export default function EntryNutritionScreen() {
  const { t } = useLanguage();
  const s = useStyles(makeStyles);
  const { entry } = useEntry();

  if (!entry) {
    return (
      <SafeAreaView style={s.safe}>
        <EntryHeader title={t.entryMoreNutrition} />
        <Text style={s.note}>{t.entryNotFound}</Text>
      </SafeAreaView>
    );
  }

  const rows = [
    { key: 'energy', label: t.energy, unit: 'kcal' },
    { key: 'protein', label: t.protein, unit: 'g' },
    { key: 'carbs', label: t.carbs, unit: 'g' },
    { key: 'fat', label: t.fat, unit: 'g' },
    ...Object.entries(MICRO_UNITS).map(([key, unit]) => ({ key, label: t[key], unit })),
  ];

  return (
    <SafeAreaView style={s.safe}>
      <EntryHeader title={t.entryMoreNutrition} />
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.name} numberOfLines={2}>{entry.name}</Text>
        <View style={s.card}>
          {rows.map((r, i) => (
            <View key={r.key} style={[s.row, i < rows.length - 1 && s.rowBorder]}>
              <Text style={s.rowLabel}>{r.label}</Text>
              <Text style={s.rowValue}>
                {typeof entry[r.key] === 'number'
                  ? `${r.key === 'energy' ? Math.round(entry[r.key]) : round1(entry[r.key])} ${r.unit}`
                  : '—'}
              </Text>
            </View>
          ))}
        </View>
        <Text style={s.note}>{t.entryEstimateNote}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  body: { paddingHorizontal: 18, paddingBottom: 40 },
  name: { fontSize: 18, fontWeight: '900', color: C.textPrimary, marginTop: 8, marginBottom: 14 },
  card: { backgroundColor: C.card, borderRadius: 18, paddingHorizontal: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  rowLabel: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  rowValue: { fontSize: 14, fontWeight: '800', color: C.textPrimary },
  note: { fontSize: 12, color: C.textSecondary, textAlign: 'center', marginTop: 14, lineHeight: 18, paddingHorizontal: 12 },
});
