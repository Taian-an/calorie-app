import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, SafeAreaView,
} from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useLanguage } from './_LanguageContext';

const C = {
  primary:       '#22C55E',
  primaryDark:   '#16A34A',
  bg:            '#F0FDF4',
  card:          '#FFFFFF',
  textPrimary:   '#14532D',
  textSecondary: '#6B7280',
  protein:       '#3B82F6',
  carbs:         '#F97316',
  fat:           '#EF4444',
};

// 三種目標的預設比例
const GOAL_PRESETS = {
  muscle: { protein: 30, carbs: 50, fat: 20 },
  cut:    { protein: 35, carbs: 35, fat: 30 },
};

// ── MacroCard ────────────────────────────────────────────────────
function MacroCard({ emoji, label, value, unit, percent, color, kcal }) {
  return (
    <View style={s.macroCard}>
      <View style={s.macroTop}>
        <Text style={s.macroEmoji}>{emoji}</Text>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={s.macroName}>{label}</Text>
          <Text style={[s.macroValue, { color }]}>
            {value.toFixed(1)} <Text style={s.macroUnit}>{unit}</Text>
          </Text>
        </View>
        <View style={s.macroBadgeCol}>
          <View style={[s.percentBadge, { backgroundColor: color + '18' }]}>
            <Text style={[s.percentText, { color }]}>{percent}%</Text>
          </View>
          <Text style={s.macroKcal}>{kcal.toFixed(0)} kcal</Text>
        </View>
      </View>
      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ── Custom Stepper Row ───────────────────────────────────────────
function StepperRow({ emoji, label, value, color, onMinus, onPlus, minusDisabled, plusDisabled, readOnly, autoLabel }) {
  return (
    <View style={s.stepperRow}>
      <Text style={s.stepperEmoji}>{emoji}</Text>
      <Text style={s.stepperLabel}>{label}</Text>
      {readOnly ? (
        <View style={s.stepperReadOnly}>
          <Text style={[s.stepperNum, { color }]}>{value}%</Text>
          <Text style={s.stepperAutoTag}>{autoLabel}</Text>
        </View>
      ) : (
        <View style={s.stepperControls}>
          <TouchableOpacity
            style={[s.stepperBtn, minusDisabled && s.stepperBtnOff]}
            onPress={onMinus}
            disabled={minusDisabled}
          >
            <Text style={[s.stepperBtnText, minusDisabled && s.stepperBtnTextOff]}>−</Text>
          </TouchableOpacity>
          <Text style={[s.stepperNum, { color }]}>{value}%</Text>
          <TouchableOpacity
            style={[s.stepperBtn, plusDisabled && s.stepperBtnOff]}
            onPress={onPlus}
            disabled={plusDisabled}
          >
            <Text style={[s.stepperBtnText, plusDisabled && s.stepperBtnTextOff]}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────
export default function Plan() {
  const { t } = useLanguage();
  const { tdee, bmr } = useLocalSearchParams();
  const tdeeVal = parseFloat(tdee) || 0;
  const bmrVal  = parseFloat(bmr)  || 0;

  // 目標模式
  const [goalMode, setGoalMode] = useState('muscle');

  // 自選比例 (protein, carbs; fat 自動計算)
  const [cp, setCp] = useState(25); // custom protein %
  const [cc, setCc] = useState(45); // custom carbs %
  const customFat = 100 - cp - cc;  // 自動 = 100 - cp - cc

  // 取得當前比例
  const ratio = goalMode === 'custom'
    ? { protein: cp, carbs: cc, fat: customFat }
    : GOAL_PRESETS[goalMode];

  // 計算公克數
  const proteinG = (tdeeVal * ratio.protein / 100) / 4;
  const carbsG   = (tdeeVal * ratio.carbs   / 100) / 4;
  const fatG     = (tdeeVal * ratio.fat     / 100) / 9;

  // 自選 Stepper 邏輯（每次 ±5%，最低 10%，fat 最低 10%）
  const STEP = 5;
  const adjustProtein = (dir) => {
    const next = cp + dir * STEP;
    if (next < 10 || next > 80) return;
    if (100 - next - cc < 10) return; // fat 不能低於 10
    setCp(next);
  };
  const adjustCarbs = (dir) => {
    const next = cc + dir * STEP;
    if (next < 10 || next > 80) return;
    if (100 - cp - next < 10) return;
    setCc(next);
  };

  const GOALS = [
    { key: 'muscle', label: t.goalMuscle ?? '增肌', emoji: '💪' },
    { key: 'cut',    label: t.goalFat    ?? '減脂', emoji: '🔥' },
    { key: 'custom', label: t.goalCustom ?? '自選', emoji: '⚙️' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>{t.planTitle}</Text>
          <Text style={s.headerSub}>{t.planSubtitle}</Text>
        </View>

        {/* TDEE Ring Card */}
        <View style={s.tdeeCard}>
          <View style={s.ring}>
            <Text style={s.ringNum}>{tdeeVal.toFixed(0)}</Text>
            <Text style={s.ringUnit}>{t.kcalUnit}</Text>
          </View>
          <View style={s.tdeeInfo}>
            <Text style={s.tdeeMainLabel}>{t.tdeeLabel}</Text>
            <View style={s.bmrtRow}>
              <View style={s.bmrBox}>
                <Text style={s.bmrLabel}>{t.bmrLabel}</Text>
                <Text style={s.bmrValue}>{bmrVal.toFixed(0)}</Text>
                <Text style={s.bmrUnit}>kcal</Text>
              </View>
              <View style={s.bmrDivider} />
              <View style={s.bmrBox}>
                <Text style={s.bmrLabel}>{t.activityExpense}</Text>
                <Text style={s.bmrValue}>{(tdeeVal - bmrVal).toFixed(0)}</Text>
                <Text style={s.bmrUnit}>kcal</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section Header + Goal Selector */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{t.macroTitle}</Text>
          <View style={s.goalPills}>
            {GOALS.map(g => (
              <TouchableOpacity
                key={g.key}
                style={[s.goalPill, goalMode === g.key && s.goalPillActive]}
                onPress={() => setGoalMode(g.key)}
                activeOpacity={0.75}
              >
                <Text style={[s.goalPillText, goalMode === g.key && s.goalPillTextActive]}>
                  {g.emoji} {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 目標說明 badge */}
        {goalMode !== 'custom' && (
          <View style={s.goalBadge}>
            <Text style={s.goalBadgeText}>
              {goalMode === 'muscle'
                ? (t.muscleDesc ?? '💪 高蛋白 + 高碳水，提升增肌效率')
                : (t.cutDesc   ?? '🔥 高蛋白 + 低碳水，促進燃脂代謝')}
            </Text>
          </View>
        )}

        {/* 自選調整面板 */}
        {goalMode === 'custom' && (
          <View style={s.customCard}>
            <Text style={s.customCardTitle}>⚙️ {t.customTitle ?? '自訂比例'}</Text>
            <View style={s.customDivider} />

            <StepperRow
              emoji="🥩" label={t.protein ?? '蛋白質'} value={cp} color={C.protein}
              onMinus={() => adjustProtein(-1)} onPlus={() => adjustProtein(1)}
              minusDisabled={cp <= 10}
              plusDisabled={cp >= 80 || 100 - (cp + STEP) - cc < 10}
            />
            <View style={s.stepperSep} />
            <StepperRow
              emoji="🍚" label={t.carbs ?? '碳水化合物'} value={cc} color={C.carbs}
              onMinus={() => adjustCarbs(-1)} onPlus={() => adjustCarbs(1)}
              minusDisabled={cc <= 10}
              plusDisabled={cc >= 80 || 100 - cp - (cc + STEP) < 10}
            />
            <View style={s.stepperSep} />
            <StepperRow
              emoji="🥑" label={t.fat ?? '脂肪'} value={customFat} color={C.fat}
              readOnly autoLabel={t.fatAuto ?? '自動計算'}
            />

            <View style={s.totalRow}>
              <Text style={s.totalLabel}>{t.totalLabel ?? '合計'}</Text>
              <Text style={[s.totalValue, { color: cp + cc + customFat === 100 ? C.primary : C.fat }]}>
                {cp + cc + customFat}%
              </Text>
            </View>
          </View>
        )}

        {/* MacroCards */}
        <MacroCard emoji="🥩" label={t.protein} value={proteinG} unit="g" percent={ratio.protein} color={C.protein} kcal={tdeeVal * ratio.protein / 100} />
        <MacroCard emoji="🍚" label={t.carbs}   value={carbsG}   unit="g" percent={ratio.carbs}   color={C.carbs}   kcal={tdeeVal * ratio.carbs   / 100} />
        <MacroCard emoji="🥑" label={t.fat}     value={fatG}     unit="g" percent={ratio.fat}     color={C.fat}     kcal={tdeeVal * ratio.fat     / 100} />

        {/* Tip */}
        <View style={s.tipCard}>
          <Text style={s.tipIcon}>💡</Text>
          <Text style={s.tipText}>{t.tipText}</Text>
        </View>

        {/* Camera CTA */}
        <TouchableOpacity style={s.cameraBtn} onPress={() => router.push('/camera')} activeOpacity={0.85}>
          <Text style={s.cameraBtnText}>{t.cameraBtn}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 20 },

  header:      { alignItems: 'center', paddingTop: 24, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, color: C.textSecondary, marginTop: 4 },

  /* TDEE */
  tdeeCard: {
    backgroundColor: C.card, borderRadius: 20, padding: 24, marginBottom: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  ring: {
    width: 164, height: 164, borderRadius: 82, borderWidth: 10, borderColor: C.primary,
    backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4,
  },
  ringNum:       { fontSize: 38, fontWeight: '900', color: C.primaryDark },
  ringUnit:      { fontSize: 13, color: C.textSecondary, fontWeight: '600', marginTop: 2 },
  tdeeInfo:      { width: '100%' },
  tdeeMainLabel: { fontSize: 13, fontWeight: '700', color: C.textPrimary, textAlign: 'center', marginBottom: 16 },
  bmrtRow:       { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 14, padding: 16, justifyContent: 'space-around' },
  bmrBox:        { alignItems: 'center' },
  bmrLabel:      { fontSize: 11, color: C.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  bmrValue:      { fontSize: 24, fontWeight: '900', color: C.textPrimary, marginTop: 4 },
  bmrUnit:       { fontSize: 11, color: C.textSecondary, fontWeight: '600' },
  bmrDivider:    { width: 1, backgroundColor: '#D1D5DB', marginVertical: 4 },

  /* Section Header + Goal Pills */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle:  { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  goalPills:     { flexDirection: 'row', gap: 6 },
  goalPill: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  goalPillActive:    { backgroundColor: C.primaryDark, borderColor: C.primaryDark },
  goalPillText:      { fontSize: 11, fontWeight: '700', color: C.textSecondary },
  goalPillTextActive:{ color: '#FFF' },

  /* Goal Badge */
  goalBadge: {
    backgroundColor: '#ECFDF5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
    marginBottom: 12, borderWidth: 1, borderColor: '#A7F3D0',
  },
  goalBadgeText: { fontSize: 12, color: C.primaryDark, fontWeight: '600' },

  /* Custom Card */
  customCard: {
    backgroundColor: C.card, borderRadius: 18, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    borderWidth: 1.5, borderColor: '#D1FAE5',
  },
  customCardTitle: { fontSize: 14, fontWeight: '800', color: C.textPrimary, marginBottom: 12 },
  customDivider:   { height: 1, backgroundColor: C.bg, marginBottom: 12 },

  /* Stepper */
  stepperRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  stepperEmoji:   { fontSize: 22, width: 32 },
  stepperLabel:   { flex: 1, fontSize: 14, fontWeight: '600', color: C.textPrimary },
  stepperControls:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: '#D1FAE5',
    justifyContent: 'center', alignItems: 'center',
  },
  stepperBtnOff:     { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  stepperBtnText:    { fontSize: 18, fontWeight: '700', color: C.primaryDark, lineHeight: 22 },
  stepperBtnTextOff: { color: '#D1D5DB' },
  stepperNum:        { fontSize: 16, fontWeight: '900', minWidth: 40, textAlign: 'center' },
  stepperReadOnly:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperAutoTag: {
    fontSize: 10, fontWeight: '700', color: C.textSecondary,
    backgroundColor: '#F3F4F6', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  stepperSep: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },

  totalRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  totalLabel:{ fontSize: 13, fontWeight: '700', color: C.textSecondary },
  totalValue:{ fontSize: 16, fontWeight: '900' },

  /* MacroCard */
  macroCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  macroTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  macroEmoji:   { fontSize: 32 },
  macroName:    { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  macroValue:   { fontSize: 24, fontWeight: '900', marginTop: 2 },
  macroUnit:    { fontSize: 14, fontWeight: '600' },
  macroBadgeCol:{ alignItems: 'flex-end', gap: 4 },
  percentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  percentText:  { fontSize: 13, fontWeight: '800' },
  macroKcal:    { fontSize: 11, color: C.textSecondary, fontWeight: '600' },
  barBg:        { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4 },
  barFill:      { height: 8, borderRadius: 4 },

  /* Tip */
  tipCard: {
    flexDirection: 'row', backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14,
    marginBottom: 20, borderWidth: 1, borderColor: '#FDE68A', gap: 10,
  },
  tipIcon: { fontSize: 20 },
  tipText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 20 },

  /* Camera CTA */
  cameraBtn: {
    backgroundColor: C.primaryDark, borderRadius: 16, paddingVertical: 18, alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  cameraBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
});
