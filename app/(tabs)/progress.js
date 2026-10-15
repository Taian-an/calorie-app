import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import { useUserData, dateKey, MICRO_KEYS } from '../../context/UserDataContext';
import { usePreferences, useStyles } from '../../context/PreferencesContext';
import { MICRO_UNITS } from '../../constants/nutrition';
import { weightTrend, daysBetween } from '../../constants/bodyCalc';
import { formatWeight, formatWeightDelta, weightToDisplay, weightUnitLabel } from '../../constants/units';


const CHART_HEIGHT = 160;
const DAYS_SHOWN = 7;

// 區間平均的可選範圍；all 用 null 代表不設下限（從有紀錄以來全部算）
const RANGES = [
  { key: '1w', days: 7 },
  { key: '1m', days: 30 },
  { key: '3m', days: 90 },
  { key: '6m', days: 180 },
  { key: '1y', days: 365 },
  { key: 'all', days: null },
];

// 微量營養素顯示用的單位（跟 server 端 AI 估算 prompt 的單位一致）

function DayBar({ label, totals, scaleMax, isToday }) {
  const { C } = usePreferences();
  const s = useStyles(makeStyles);
  const energy = totals?.energy ?? 0;
  const barHeight = energy > 0 ? Math.max((energy / scaleMax) * CHART_HEIGHT, 4) : 0;
  const proteinKcal = (totals?.protein ?? 0) * 4;
  const carbsKcal   = (totals?.carbs   ?? 0) * 4;
  const fatKcal      = (totals?.fat    ?? 0) * 9;
  const segTotal = proteinKcal + carbsKcal + fatKcal || 1;

  return (
    <View style={s.dayCol}>
      <View style={s.barTrack}>
        {barHeight > 0 && (
          <View style={[s.barStack, { height: barHeight }]}>
            <View style={[s.barSeg, { flex: carbsKcal   / segTotal || 0.001, backgroundColor: C.macroCarbs   }]} />
            <View style={[s.barSeg, { flex: proteinKcal / segTotal || 0.001, backgroundColor: C.macroProtein }]} />
            <View style={[s.barSeg, { flex: fatKcal     / segTotal || 0.001, backgroundColor: C.macroFat     }]} />
          </View>
        )}
      </View>
      <Text style={[s.dayLabel, isToday && s.dayLabelToday]}>{label}</Text>
    </View>
  );
}

export default function ProgressScreen() {
  const { C, units } = usePreferences();
  const s = useStyles(makeStyles);
  const { t } = useLanguage();
  const router = useRouter();
  const { profile, dailyLogs, getDayTotals } = useUserData();
  const [selectedRange, setSelectedRange] = useState('1w');

  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => {
    const offset = -(DAYS_SHOWN - 1) + i; // 舊 -> 新，最後一天是今天
    const key = dateKey(offset);
    return { key, offset, label: key.slice(5).replace('-', '/'), totals: getDayTotals(key) };
  });

  const goal = profile?.target ?? profile?.tdee ?? null;

  // ── 總體進步：從第一筆紀錄統計到今天 ──
  const trackedKeys = Object.keys(dailyLogs).filter(k => dailyLogs[k]?.meals?.length).sort();
  const daysTracked = trackedKeys.length;
  const firstDayLabel = daysTracked ? trackedKeys[0].slice(5).replace('-', '/') : null;

  // ── 區間平均（1w/1m/3m/6m/1y/all）：三大營養素 + 微量營養素，只算選定範圍內「有紀錄」的天數 ──
  const rangeDays = RANGES.find(r => r.key === selectedRange).days;
  const rangeCutoff = rangeDays != null ? dateKey(-(rangeDays - 1)) : null;
  const rangeKeys = rangeCutoff != null ? trackedKeys.filter(k => k >= rangeCutoff) : trackedKeys;
  const rangeDaysTracked = rangeKeys.length;
  const rangeAverages = rangeDaysTracked ? (() => {
    const sums = rangeKeys.reduce((acc, k) => {
      const tot = getDayTotals(k);
      acc.energy += tot.energy; acc.protein += tot.protein; acc.carbs += tot.carbs; acc.fat += tot.fat;
      for (const mk of MICRO_KEYS) acc[mk] += tot[mk] || 0;
      return acc;
    }, { energy: 0, protein: 0, carbs: 0, fat: 0, ...Object.fromEntries(MICRO_KEYS.map(mk => [mk, 0])) });
    const avg = {};
    for (const key of ['energy', 'protein', 'carbs', 'fat', ...MICRO_KEYS]) {
      avg[key] = Math.round((sums[key] / rangeDaysTracked) * 10) / 10;
    }
    return avg;
  })() : null;

  // 連續紀錄天數（今天還沒記不中斷，從昨天往回算）
  let streak = 0;
  for (let i = 0; ; i++) {
    const has = dailyLogs[dateKey(-i)]?.meals?.length;
    if (has) streak++;
    else if (i > 0) break;
  }

  // 平均攝取與達成率
  const sums = trackedKeys.reduce((acc, k) => {
    const tot = getDayTotals(k);
    acc.energy += tot.energy; acc.protein += tot.protein; acc.carbs += tot.carbs; acc.fat += tot.fat;
    return acc;
  }, { energy: 0, protein: 0, carbs: 0, fat: 0 });
  const avgEnergy  = daysTracked ? Math.round(sums.energy / daysTracked) : 0;
  const avgProtein = daysTracked ? Math.round(sums.protein / daysTracked) : 0;
  const avgCarbs   = daysTracked ? Math.round(sums.carbs / daysTracked) : 0;
  const avgFat     = daysTracked ? Math.round(sums.fat / daysTracked) : 0;
  const adherence = goal != null && daysTracked
    ? Math.round(trackedKeys.filter(k => getDayTotals(k).energy <= goal).length / daysTracked * 100)
    : null;

  // 體重變化看 Weight trend（7 日平均），不看單日數字：
  // 起點 = 第一次量體重起 7 天內的平均，終點 = 最近一次量測當天的 7 日平均
  const weightKeys = Object.keys(dailyLogs).filter(k => dailyLogs[k]?.weight != null).sort();
  const trend = weightTrend(dailyLogs);
  const startPts = trend.filter(p => daysBetween(trend[0].date, p.date) < 7);
  const startWeight = trend.length >= 2 ? startPts.reduce((sum, p) => sum + p.weight, 0) / startPts.length : null;
  const currentWeight = trend.length >= 2 ? trend[trend.length - 1].avg : null;
  const weightDelta = startWeight != null && currentWeight != null
    ? Math.round((currentWeight - startWeight) * 10) / 10
    : null;
  // 增肌期上升是好事、減脂期下降是好事，其他情況小幅變動視為正向
  const deltaGood = weightDelta == null ? true
    : profile?.goal === 'bulk' ? weightDelta >= 0
    : profile?.goal === 'cut'  ? weightDelta <= 0
    : Math.abs(weightDelta) < 2;
  // 預估體重：從最後一次量的體重開始，把之後每天「吃的 − TDEE」累加，約 7700 kcal ≈ 1 kg。
  // 今天還沒吃完不算；沒記錄的天數不知道吃了多少，也不算。使用者一更新體重（寫進當天日誌）就從那天重新起算
  const lastWeighKey = weightKeys.length ? weightKeys[weightKeys.length - 1] : null;
  const todayKey = dateKey();
  const estimate = lastWeighKey && profile?.tdee ? (() => {
    const keys = trackedKeys.filter(k => k > lastWeighKey && k < todayKey);
    if (!keys.length) return null;
    const net = keys.reduce((sum, k) => sum + getDayTotals(k).energy - profile.tdee, 0);
    const base = dailyLogs[lastWeighKey].weight;
    return {
      base, baseLabel: lastWeighKey.slice(5).replace('-', '/'), days: keys.length,
      net: Math.round(net), weight: Math.round((base + net / 7700) * 10) / 10,
      delta: Math.round((net / 7700) * 10) / 10,
    };
  })() : null;

  const maxEnergy = Math.max(1, goal ?? 0, ...days.map(d => d.totals?.energy ?? 0));
  const goalLineTop = goal != null ? CHART_HEIGHT - Math.min(goal / maxEnergy, 1) * CHART_HEIGHT : null;

  const periodTotal = days.reduce((sum, d) => sum + (d.totals?.energy ?? 0), 0);
  const periodAvg = Math.round(periodTotal / DAYS_SHOWN);

  const today = days[days.length - 1];
  const todayEnergy = Math.round(today.totals?.energy ?? 0);
  const todayRemaining = goal != null ? Math.round(goal - todayEnergy) : null;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <Text style={s.headerTitle}>{t.dailyTracking}</Text>
        </View>

        {/* ── 區間平均：三大營養素 + 微量營養素 ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📊 {t.nutrientAverages}</Text>
          <View style={s.rangeRow}>
            {RANGES.map(r => {
              const isSel = r.key === selectedRange;
              return (
                <TouchableOpacity
                  key={r.key}
                  style={[s.rangeChip, isSel && s.rangeChipSel]}
                  onPress={() => setSelectedRange(r.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.rangeChipText, isSel && s.rangeChipTextSel]}>
                    {t[r.key === 'all' ? 'rangeAll' : `range${r.key}`]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={s.divider} />

          {!rangeAverages ? (
            <Text style={s.noDataText}>{t.noDataYet}</Text>
          ) : (
            <>
              <Text style={s.avgLabel}>{t.avgIntake}（{rangeDaysTracked} {t.daysUnit}）</Text>
              <Text style={s.avgValue}>
                {Math.round(rangeAverages.energy)} <Text style={s.avgUnit}>kcal</Text>
              </Text>
              <View style={s.macroGrid}>
                <View style={s.macroGridItem}>
                  <Text style={[s.macroGridVal, { color: C.macroProtein }]}>{rangeAverages.protein}g</Text>
                  <Text style={s.macroGridLabel}>{t.proteinShort}</Text>
                </View>
                <View style={s.macroGridItem}>
                  <Text style={[s.macroGridVal, { color: C.macroCarbs }]}>{rangeAverages.carbs}g</Text>
                  <Text style={s.macroGridLabel}>{t.carbsShort}</Text>
                </View>
                <View style={s.macroGridItem}>
                  <Text style={[s.macroGridVal, { color: C.macroFat }]}>{rangeAverages.fat}g</Text>
                  <Text style={s.macroGridLabel}>{t.fatShort}</Text>
                </View>
              </View>

              <Text style={[s.avgLabel, { marginTop: 18 }]}>{t.avgMicros}</Text>
              <View style={s.microGrid}>
                {MICRO_KEYS.map(mk => (
                  <View key={mk} style={s.microGridItem}>
                    <Text style={s.microGridVal}>{rangeAverages[mk]}{MICRO_UNITS[mk]}</Text>
                    <Text style={s.microGridLabel}>{t[mk]}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* ── 總體進步 ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🏆 {t.overallProgress}</Text>
          <View style={s.divider} />
          {daysTracked === 0 ? (
            <Text style={s.noDataText}>{t.noDataYet}</Text>
          ) : (
            <>
              <View style={s.overallRow}>
                <View style={s.overallBox}>
                  <Text style={s.overallValue}>{daysTracked}</Text>
                  <Text style={s.overallLabel}>{t.daysTracked}（{t.daysUnit}）</Text>
                </View>
                <View style={s.overallBox}>
                  <Text style={s.overallValue}>🔥 {streak}</Text>
                  <Text style={s.overallLabel}>{t.currentStreak}（{t.daysUnit}）</Text>
                </View>
                <View style={s.overallBox}>
                  <Text style={s.overallValue}>{firstDayLabel}</Text>
                  <Text style={s.overallLabel}>{t.sinceLabel}</Text>
                </View>
              </View>

              {/* 平均攝取 + 達成率 */}
              <View style={s.avgRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.avgLabel}>{t.avgIntake}</Text>
                  <Text style={s.avgValue}>
                    {avgEnergy} <Text style={s.avgUnit}>kcal</Text>
                  </Text>
                  <Text style={s.avgMacroText}>
                    🔵 {avgProtein}g・🟠 {avgCarbs}g・🔴 {avgFat}g
                  </Text>
                </View>
                {adherence != null && (
                  <View style={s.adherenceBox}>
                    <Text style={[s.adherenceValue, adherence < 50 && { color: C.surplus }]}>{adherence}%</Text>
                    <Text style={s.avgLabel}>{t.adherenceRate}</Text>
                  </View>
                )}
              </View>
              {adherence != null && (
                <>
                  <View style={s.adherenceBarBg}>
                    <View style={[s.adherenceBarFill, { width: `${adherence}%` }, adherence < 50 && { backgroundColor: C.surplus }]} />
                  </View>
                  <Text style={s.adherenceHint}>{t.adherenceHint}</Text>
                </>
              )}

              {/* 體重變化 */}
              {weightDelta != null && (
                <View style={s.weightRow}>
                  <Text style={s.avgLabel}>⚖️ {t.weightChange}・{t.weightTrend7d}</Text>
                  <Text style={s.weightText}>
                    {formatWeight(startWeight, units)} → {formatWeight(currentWeight, units)}
                    <Text style={[s.weightDelta, { color: deltaGood ? C.primaryDark : C.surplus }]}>
                      {'  '}{formatWeightDelta(weightDelta, units)}
                    </Text>
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* ── 依飲食紀錄預估的體重 ── */}
        {estimate && (
          <View style={s.card}>
            <Text style={s.cardTitle}>🔮 {t.estWeightTitle}</Text>
            <Text style={s.estValue}>
              {weightToDisplay(estimate.weight, units)} <Text style={s.avgUnit}>{weightUnitLabel(units)}</Text>
              <Text style={[s.weightDelta, { color: C.textSecondary }]}>
                {'  '}{formatWeightDelta(estimate.delta, units)}
              </Text>
            </Text>
            <Text style={s.estBody}>
              {t.estWeightBody
                .replace('{date}', estimate.baseLabel)
                .replace('{w}', formatWeight(estimate.base, units))
                .replace('{d}', estimate.days)
                .replace('{net}', `${estimate.net > 0 ? '+' : ''}${estimate.net}`)}
            </Text>
            <TouchableOpacity style={s.estBtn} onPress={() => router.push('/profile')} activeOpacity={0.8}>
              <Text style={s.estBtnText}>{t.estWeightUpdate}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!profile ? (
          <View style={s.card}>
            <Text style={s.noDataText}>{t.noDataYet}</Text>
          </View>
        ) : (
          <>
            {/* 今日摘要 */}
            <View style={s.card}>
              <View style={s.trackRow}>
                <View style={s.trackBox}>
                  <Text style={s.trackLabel}>{t.todayIntake}</Text>
                  <Text style={s.trackValue}>{todayEnergy} <Text style={s.trackUnit}>kcal</Text></Text>
                </View>
                <View style={s.trackBox}>
                  <Text style={s.trackLabel}>{t.remainingCalories}</Text>
                  <Text style={[s.trackValue, todayRemaining != null && todayRemaining < 0 && { color: C.surplus }]}>
                    {todayRemaining ?? '—'} <Text style={s.trackUnit}>kcal</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* 7 天趨勢圖 */}
            <View style={s.card}>
              <View style={s.chartHeader}>
                <Text style={s.sectionLabel}>{t.dailyTracking}</Text>
                {goal != null && <Text style={s.goalText}>{t.dailyGoal} {Math.round(goal)} kcal</Text>}
              </View>
              <Text style={s.periodTotal}>{Math.round(periodTotal)} <Text style={s.trackUnit}>kcal</Text></Text>
              <Text style={s.periodAvg}>{periodAvg} {t.kcalUnit}</Text>

              <View style={s.chartArea}>
                {goalLineTop != null && (
                  <View style={[s.goalLine, { top: goalLineTop }]} />
                )}
                <View style={s.chartRow}>
                  {days.map(d => (
                    <DayBar
                      key={d.key}
                      label={d.label}
                      totals={d.totals}
                      scaleMax={maxEnergy}
                      isToday={d.offset === 0}
                    />
                  ))}
                </View>
              </View>

              <View style={s.macroLegendRow}>
                <Text style={s.macroLegendText}>🔵 {t.protein}</Text>
                <Text style={s.macroLegendText}>🟠 {t.carbs}</Text>
                <Text style={s.macroLegendText}>🔴 {t.fat}</Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 20 },

  header:      { alignItems: 'center', paddingTop: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5, textAlign: 'center' },

  /* 區間平均 */
  rangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  rangeChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: C.subtle, borderWidth: 1, borderColor: C.border,
  },
  rangeChipSel:     { backgroundColor: C.primary, borderColor: C.primary },
  rangeChipText:    { fontSize: 12, fontWeight: '700', color: C.textSecondary },
  rangeChipTextSel: { color: C.onPrimary },

  macroGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  macroGridItem: {
    flex: 1, alignItems: 'center', backgroundColor: C.subtle,
    borderRadius: 12, paddingVertical: 10,
  },
  macroGridVal:   { fontSize: 16, fontWeight: '900' },
  macroGridLabel: { fontSize: 11, fontWeight: '600', color: C.textSecondary, marginTop: 2 },

  microGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  microGridItem: {
    width: '31%', alignItems: 'center', backgroundColor: C.subtle,
    borderRadius: 12, paddingVertical: 10,
  },
  microGridVal:   { fontSize: 14, fontWeight: '800', color: C.textPrimary },
  microGridLabel: { fontSize: 10, fontWeight: '600', color: C.textSecondary, marginTop: 2 },

  card: {
    backgroundColor: C.card, borderRadius: 18, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  noDataText: { fontSize: 13, color: C.textSecondary, fontStyle: 'italic', textAlign: 'center' },

  /* 總體進步 */
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  divider:   { height: 1, backgroundColor: C.border, marginVertical: 12 },
  overallRow: { flexDirection: 'row', gap: 10 },
  overallBox: {
    flex: 1, backgroundColor: C.subtle, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center',
  },
  overallValue: { fontSize: 17, fontWeight: '900', color: C.textPrimary },
  overallLabel: { fontSize: 10, fontWeight: '600', color: C.textSecondary, marginTop: 3, textAlign: 'center' },

  avgRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  avgLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  avgValue: { fontSize: 24, fontWeight: '900', color: C.textPrimary, marginTop: 2 },
  avgUnit:  { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  avgMacroText: { fontSize: 11, fontWeight: '600', color: C.textSecondary, marginTop: 4 },
  adherenceBox:   { alignItems: 'flex-end' },
  adherenceValue: { fontSize: 24, fontWeight: '900', color: C.primaryDark },
  adherenceBarBg:   { height: 8, backgroundColor: C.muted, borderRadius: 4, marginTop: 10 },
  adherenceBarFill: { height: 8, borderRadius: 4, backgroundColor: C.primary },
  adherenceHint:    { fontSize: 10, color: C.textSecondary, marginTop: 5 },

  weightRow:   { marginTop: 16, gap: 4 },
  estValue:    { fontSize: 24, fontWeight: '900', color: C.textPrimary, marginTop: 8 },
  estBody:     { fontSize: 12, color: C.textSecondary, lineHeight: 18, marginTop: 6 },
  estBtn: {
    alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, backgroundColor: C.bg,
  },
  estBtnText:  { fontSize: 12, fontWeight: '700', color: C.primaryDark },
  weightText:  { fontSize: 15, fontWeight: '800', color: C.textPrimary, marginTop: 2 },
  weightDelta: { fontSize: 14, fontWeight: '900' },

  trackRow:   { flexDirection: 'row', gap: 10 },
  trackBox:   { flex: 1, backgroundColor: C.subtle, borderRadius: 12, padding: 12 },
  trackLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  trackValue: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  trackUnit:  { fontSize: 12, fontWeight: '600', color: C.textSecondary },

  chartHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalText:     { fontSize: 12, fontWeight: '700', color: C.primaryDark },
  periodTotal:  { fontSize: 28, fontWeight: '900', color: C.textPrimary, marginTop: 8 },
  periodAvg:    { fontSize: 12, color: C.textSecondary, marginTop: 2, marginBottom: 16 },

  chartArea: { position: 'relative' },
  goalLine: {
    position: 'absolute', left: 0, right: 0,
    borderTopWidth: 1.5, borderColor: C.textSecondary, borderStyle: 'dashed',
    zIndex: 1,
  },
  chartRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    height: CHART_HEIGHT,
  },

  dayCol:   { alignItems: 'center', flex: 1 },
  barTrack: { height: CHART_HEIGHT, justifyContent: 'flex-end', width: 26 },
  barStack: { width: '100%', borderRadius: 6, overflow: 'hidden' },
  barSeg:   { width: '100%' },
  dayLabel:      { fontSize: 10, color: C.textSecondary, marginTop: 8, fontWeight: '600' },
  dayLabelToday: { color: C.primaryDark, fontWeight: '800' },

  macroLegendRow:  { flexDirection: 'row', justifyContent: 'space-around', marginTop: 18 },
  macroLegendText: { fontSize: 11, fontWeight: '600', color: C.textSecondary },
});
