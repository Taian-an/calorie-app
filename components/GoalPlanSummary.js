import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences, useStyles } from '../context/PreferencesContext';
import { calculateMacroTargets } from '../constants/goalPlan';
import { formatWeight, formatWeightDelta } from '../constants/units';

// Live result of validateGoal for the Goal plan screen and the onboarding timeline step:
// the estimate, blocking errors, warnings, and (only when it passed validation itself) a longer
// timeline the user can apply. All text comes from translations by stable code.

const WEIGHT_PARAMS = ['min', 'max'];

export function formatGoalIssue(issue, t, units) {
  const template = t.goalCodes?.[issue.code] ?? issue.code;
  const params = issue.params ?? {};
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (key === 'reason') return t.goalReasons?.[params.reason] ?? t.goalReasons?.other ?? '';
    const v = params[key];
    if (v == null) return '';
    return WEIGHT_PARAMS.includes(key) ? formatWeight(v, units) : String(v);
  });
}

export function formatPlanDate(key, lang) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const weeksOf = days => Math.round((days / 7) * 10) / 10;

export default function GoalPlanSummary({ validation, goalType, weightKg, t, lang, onApplySuggestion }) {
  const { C, units } = usePreferences();
  const s = useStyles(makeStyles);
  if (!validation) return null;
  const { estimate, errors, warnings, suggestion, allowed } = validation;
  const n = v => Math.round(v).toLocaleString();
  const macros = estimate && allowed
    ? calculateMacroTargets({ calories: estimate.estimatedDailyCalories, weightKg, goalType })
    : null;

  const rows = [];
  if (estimate && goalType !== 'maintain') {
    rows.push([t.estWeightChange, formatWeightDelta(estimate.weightChangeKg, units)]);
    rows.push([t.estTimeline, t.estTimelineValue.replace('{w}', weeksOf(estimate.days)).replace('{d}', estimate.days)]);
    rows.push([t.estPerWeek, t.estPerWeekValue
      .replace('{kg}', formatWeightDelta(estimate.weeklyChangeKg, units))
      .replace('{p}', estimate.weeklyRatePercent.toFixed(2))]);
    rows.push([t.estDailyChange, `${estimate.dailyAdjustmentKcal > 0 ? '+' : '−'}${n(Math.abs(estimate.dailyAdjustmentKcal))} kcal`]);
  }
  if (estimate) rows.push([t.estDailyTarget, `${n(estimate.estimatedDailyCalories)} kcal`, true]);
  if (macros) rows.push([t.estMacros, t.estMacrosValue.replace('{p}', macros.protein).replace('{c}', macros.carbs).replace('{f}', macros.fat)]);

  return (
    <View>
      {rows.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>{t.estTitle}</Text>
          {rows.map(([label, value, strong], i) => (
            <View key={label} style={[s.row, i < rows.length - 1 && s.rowBorder]}>
              <Text style={s.rowLabel}>{label}</Text>
              <Text style={[s.rowValue, strong && s.rowValueStrong, !allowed && strong && s.rowValueBlocked]}>{value}</Text>
            </View>
          ))}
        </View>
      )}

      {errors.length > 0 && (
        <View style={[s.notice, s.noticeError]} accessibilityRole="alert">
          <View style={s.noticeHead}>
            <Ionicons name="close-circle" size={18} color={C.danger} />
            <Text style={[s.noticeTitle, { color: C.danger }]}>{t.goalBlockedTitle}</Text>
          </View>
          {errors.map((e, i) => <Text key={i} style={s.noticeText}>{formatGoalIssue(e, t, units)}</Text>)}
          {suggestion && (
            <>
              <Text style={[s.noticeText, s.suggestText]}>
                {t.goalSuggest.replace('{date}', formatPlanDate(suggestion.targetDate, lang)).replace('{w}', weeksOf(suggestion.days))}
              </Text>
              {onApplySuggestion && (
                <TouchableOpacity
                  style={s.suggestBtn}
                  onPress={() => onApplySuggestion(suggestion)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={t.goalUseSuggestion}
                >
                  <Ionicons name="calendar-outline" size={16} color={C.onPrimary} />
                  <Text style={s.suggestBtnText}>{t.goalUseSuggestion}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}

      {warnings.length > 0 && (
        <View style={[s.notice, s.noticeWarn]}>
          <View style={s.noticeHead}>
            <Ionicons name="alert-circle" size={18} color={C.warn} />
            <Text style={[s.noticeTitle, { color: C.warn }]}>{t.goalWarningTitle}</Text>
          </View>
          {warnings.map((w, i) => <Text key={i} style={s.noticeText}>{formatGoalIssue(w, t, units)}</Text>)}
        </View>
      )}

      {goalType !== 'maintain' && <Text style={s.disclaimer}>{t.estDisclaimer}</Text>}
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6, marginTop: 16, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 13, fontWeight: '800', color: C.textSecondary, marginTop: 10, marginBottom: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  rowLabel: { fontSize: 14, fontWeight: '600', color: C.textSecondary, flexShrink: 1 },
  rowValue: { fontSize: 14, fontWeight: '800', color: C.textPrimary, textAlign: 'right', flexShrink: 1 },
  rowValueStrong: { fontSize: 17, color: C.primaryDark },
  rowValueBlocked: { color: C.danger },
  notice: { borderRadius: 14, padding: 14, marginTop: 14, borderWidth: 1.5 },
  noticeError: { backgroundColor: C.dangerSoft, borderColor: C.danger },
  noticeWarn: { backgroundColor: C.warnSoft, borderColor: C.warn },
  noticeHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  noticeTitle: { fontSize: 14, fontWeight: '800' },
  noticeText: { fontSize: 13, color: C.textPrimary, lineHeight: 19, marginTop: 2 },
  suggestText: { marginTop: 10, fontWeight: '700' },
  suggestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'flex-start',
    marginTop: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.primary,
  },
  suggestBtnText: { fontSize: 14, fontWeight: '800', color: C.onPrimary },
  disclaimer: { fontSize: 12, color: C.textSecondary, lineHeight: 18, marginTop: 12 },
});
