import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { usePreferences, useStyles } from '../context/PreferencesContext';
import { useUserData } from '../context/UserDataContext';
import { EntryHeader } from '../components/EntryParts';
import GoalPlanSummary, { formatPlanDate } from '../components/GoalPlanSummary';
import { WeightSheet, TargetDateSheet } from '../components/ProfileWheels';
import { validateGoal, goalInputFromProfile, addDays, daysBetween } from '../constants/goalPlan';
import { recalcProfile, todayKey } from '../constants/bodyCalc';
import { formatWeight } from '../constants/units';

// Goal plan（見 GLOSSARY）：目標（減脂 / 維持 / 增肌）、目標體重、目標日期。
// 每改一項就用 constants/goalPlan.js 的 validateGoal 重新檢查，顯示預估、阻擋原因、警告和建議的時程；
// 沒通過就不能儲存。後端存檔時會用同一份程式再檢查一次（services/profileUpdate.js）
const GOAL_ORDER = ['cut', 'maintain', 'bulk'];

export default function GoalPlanScreen() {
  const { lang, t } = useLanguage();
  const { C, units } = usePreferences();
  const s = useStyles(makeStyles);
  const { profile, updateProfile } = useUserData();
  const today = todayKey();

  const [goal, setGoal] = useState(() => (GOAL_ORDER.includes(profile?.goal) ? profile.goal : 'maintain'));
  const [targetWeight, setTargetWeight] = useState(profile?.targetWeight ?? profile?.weight ?? null);
  const [goalDate, setGoalDate] = useState(() => (
    profile?.goalDate && profile.goalDate > today ? profile.goalDate : addDays(today, 91)
  ));
  const [sheet, setSheet] = useState(null); // 'weight' | 'date' | null

  const draft = profile ? { ...profile, goal, targetWeight, goalDate: goal === 'maintain' ? null : goalDate } : null;
  const validation = useMemo(
    () => (draft ? validateGoal(goalInputFromProfile(draft, today)) : null),
    [goal, targetWeight, goalDate, profile?.weight, profile?.tdee, profile?.gender, profile?.age, today],
  );

  if (!profile) return null;

  // 換目標時不偷偷改目標體重或日期：方向不對就讓驗證顯示原因，使用者自己調
  const chooseGoal = (g) => setGoal(g);

  const save = () => {
    if (!validation?.allowed) return;
    updateProfile(recalcProfile(draft, today), { weighedIn: false });
    router.canGoBack() ? router.back() : router.replace('/profile');
  };

  const goalLabels = { cut: t.goalFat, maintain: t.goalMaintain, bulk: t.goalMuscle };
  const weeks = goal !== 'maintain' ? Math.round((daysBetween(today, goalDate) / 7) * 10) / 10 : null;

  return (
    <SafeAreaView style={s.safe}>
      <EntryHeader title={t.goalPlanTitle} />
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>{t.goalTypeLabel}</Text>
        <View style={s.segment} accessibilityRole="radiogroup">
          {GOAL_ORDER.map(g => (
            <TouchableOpacity
              key={g}
              style={[s.segmentBtn, goal === g && s.segmentBtnActive]}
              onPress={() => chooseGoal(g)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected: goal === g }}
            >
              <Text style={[s.segmentText, goal === g && s.segmentTextActive]}>{goalLabels[g]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.card}>
          <Row label={t.weight} value={formatWeight(profile.weight, units)} s={s} />
          {goal !== 'maintain' ? (
            <>
              <Row
                label={t.goalWeight}
                value={targetWeight != null ? formatWeight(targetWeight, units) : t.notSet}
                onPress={() => setSheet('weight')}
                s={s} C={C}
              />
              <Row
                label={t.goalTargetDate}
                value={`${formatPlanDate(goalDate, lang)}${weeks > 0 ? ` · ${t.goalWeeksShort.replace('{n}', weeks)}` : ''}`}
                onPress={() => setSheet('date')}
                s={s} C={C} last
              />
            </>
          ) : (
            <Text style={s.note}>{t.goalNoTimeline}</Text>
          )}
        </View>

        <GoalPlanSummary
          validation={validation}
          goalType={goal}
          weightKg={profile.weight}
          t={t}
          lang={lang}
          onApplySuggestion={sug => setGoalDate(sug.targetDate)}
        />
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.saveBtn, !validation?.allowed && s.saveBtnDisabled]}
          onPress={save}
          disabled={!validation?.allowed}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ disabled: !validation?.allowed }}
        >
          <Text style={s.saveBtnText}>{t.goalPlanSave}</Text>
        </TouchableOpacity>
      </View>

      {sheet === 'weight' && (
        <WeightSheet
          title={t.goalWeight} t={t} units={units}
          initialKg={targetWeight ?? profile.weight}
          onClose={() => setSheet(null)}
          onSave={kg => { setTargetWeight(kg); setSheet(null); }}
        />
      )}
      {sheet === 'date' && (
        <TargetDateSheet
          t={t} lang={lang}
          initial={goalDate}
          onClose={() => setSheet(null)}
          onSave={key => { setGoalDate(key); setSheet(null); }}
        />
      )}
    </SafeAreaView>
  );
}

function Row({ label, value, onPress, s, C, last }) {
  const inner = (
    <View style={[s.row, !last && s.rowBorder]}>
      <Text style={s.rowLabel}>{label}</Text>
      <View style={s.rowRight}>
        <Text style={s.rowValue}>{value}</Text>
        {onPress && <Ionicons name="chevron-forward" size={16} color={C.textSecondary} />}
      </View>
    </View>
  );
  return onPress
    ? <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`}>{inner}</TouchableOpacity>
    : inner;
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  body: { paddingHorizontal: 18, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: '700', color: C.textSecondary, marginTop: 8, marginBottom: 8 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
  },
  segmentBtnActive: { borderColor: C.primary, backgroundColor: C.tint },
  segmentText: { fontSize: 15, fontWeight: '700', color: C.textSecondary },
  segmentTextActive: { color: C.primaryDark, fontWeight: '800' },
  card: { backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 16, marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  rowLabel: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  rowValue: { fontSize: 15, fontWeight: '700', color: C.textSecondary, flexShrink: 1, textAlign: 'right' },
  note: { fontSize: 13, color: C.textSecondary, paddingVertical: 14 },
  footer: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
  saveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: C.primary },
  saveBtnDisabled: { backgroundColor: C.borderStrong },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: C.onPrimary },
});
