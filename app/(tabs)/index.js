import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, SafeAreaView, Modal, Animated,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useLanguage } from '../../context/LanguageContext';
import { useUserData, dateKey, MEAL_TYPES } from '../../context/UserDataContext';

const C = {
  primary:       '#22C55E',
  primaryDark:   '#16A34A',
  bg:            '#F0FDF4',
  card:          '#FFFFFF',
  textPrimary:   '#14532D',
  textSecondary: '#6B7280',
  border:        '#E5E7EB',
  macroProtein:  '#3B82F6',
  macroCarbs:    '#F97316',
  macroFat:      '#EF4444',
  deficit:       '#16A34A',
  surplus:       '#DC2626',
  ringTrack:     '#E5E7EB',
  ringOver:      '#F97316', // 超過目標熱量時，圓環從綠色變橘色示警
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_SIZE = 132;
const RING_STROKE = 9;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// 熱量圓環：隨已攝取熱量逐步畫出，達標時剛好形成閉環；超過目標則整圈變橘色示警
function CalorieRing({ eaten, goal, children }) {
  const progress = goal ? Math.min(eaten / goal, 1) : 0;
  const isOver = goal != null && eaten > goal;
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 700,
      useNativeDriver: false, // strokeDashoffset 不支援 native driver
    }).start();
  }, [progress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  });

  return (
    <View style={s.ring}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
        <Circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
          stroke={C.ringTrack} strokeWidth={RING_STROKE} fill="none"
        />
        <AnimatedCircle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
          stroke={isOver ? C.ringOver : C.primary} strokeWidth={RING_STROKE} fill="none"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

// 各餐次佔每日熱量目標的比例（spec 2.2 的餐次熱量分配）
const MEAL_META = {
  breakfast: { emoji: '🌅', share: 0.25 },
  lunch:     { emoji: '☀️', share: 0.30 },
  dinner:    { emoji: '🌙', share: 0.29 },
  snacks:    { emoji: '🍎', share: 0.16 },
};

// 目標模式：對 TDEE 的熱量增減（增肌盈餘 / 減脂缺口 / 維持不變）
const GOAL_META = {
  bulk:     { emoji: '💪', delta: +300 },
  cut:      { emoji: '🔥', delta: -400 },
  maintain: { emoji: '⚖️', delta: 0 },
};
const GOAL_KEYS = ['bulk', 'cut', 'maintain'];
const goalLabel = (t, key) =>
  key === 'bulk' ? t.goalMuscle : key === 'cut' ? t.goalFat : t.goalMaintain;

// 活動程度圖示（與個人資料頁一致）
const ACTIVITY_EMOJI = {
  sedentary:  '🧘',
  lightly:    '🚶',
  moderately: '🏃',
  very:       '🏋️',
  extra:      '🥊',
};

// 某一週（週一到週日）的日期資訊；weekOffset 0 = 本週，-1 = 上週…
function getWeek(weekOffset = 0) {
  const todayDow = (new Date().getDay() + 6) % 7; // 0 = 週一
  return Array.from({ length: 7 }, (_, i) => {
    const offset = i - todayDow + weekOffset * 7;
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return { key: dateKey(offset), dayNum: d.getDate(), isToday: offset === 0 };
  });
}

// 某年某月的月曆格子（週一起始，前面補 null 對齊星期）
function getMonthCells(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = 週一
  const cells = Array(startDow).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date();
    d.setFullYear(year, month, day);
    cells.push({ day, key: d.toISOString().slice(0, 10) });
  }
  return cells;
}

function MacroProgress({ label, cur, target, color }) {
  const pct = target > 0 ? Math.min(cur / target, 1) * 100 : 0;
  return (
    <View style={s.macroWrap}>
      <View style={s.macroTop}>
        <Text style={s.macroLabel}>{label}</Text>
        <Text style={[s.macroVal, { color }]}>{Math.round(cur)} / {target} g</Text>
      </View>
      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function MealSection({ type, meals, goal, t, onAdd, onRemove }) {
  const [open, setOpen] = useState(false);
  const subtotal = Math.round(meals.reduce((sum, m) => sum + (m.energy || 0), 0));
  const target = goal != null ? Math.round(goal * MEAL_META[type].share) : null;
  const pct = target ? Math.min(subtotal / target, 1) * 100 : 0;

  return (
    <View style={s.mealCard}>
      <TouchableOpacity style={s.mealHeader} onPress={() => setOpen(o => !o)} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={s.mealName}>{t[type]}</Text>
          <Text style={s.mealKcal}>
            {subtotal}{target != null ? ` / ${target}` : ''} kcal
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.textSecondary} />
        <TouchableOpacity style={s.addBtn} onPress={onAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: C.primary }]} />
      </View>

      {open && (
        meals.length ? meals.map(m => (
          <View key={m.time} style={s.mealItemRow}>
            <Text style={s.mealItemName} numberOfLines={1}>{m.name}</Text>
            <Text style={s.mealItemKcal}>{Math.round(m.energy || 0)} kcal</Text>
            <TouchableOpacity onPress={() => onRemove(m.time)} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={C.macroFat} />
            </TouchableOpacity>
          </View>
        )) : (
          <Text style={s.noMeals}>{t.noMealsLogged}</Text>
        )
      )}
    </View>
  );
}

export default function DiaryScreen() {
  const { lang, t } = useLanguage();
  const { profile, dailyLogs, updateProfile, getDayTotals, getMealsByType, removeMeal } = useUserData();
  const [selectedKey, setSelectedKey] = useState(dateKey());
  const [weekOffset, setWeekOffset] = useState(0);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [selGoal, setSelGoal] = useState('maintain');
  const [selActivity, setSelActivity] = useState('sedentary');
  const [showCalModal, setShowCalModal] = useState(false);
  const [calYM, setCalYM] = useState({ y: new Date().getFullYear(), m: new Date().getMonth() });
  const [addTarget, setAddTarget] = useState(null); // 正在為哪個餐次加食物（null = 關閉）

  const week = getWeek(weekOffset);
  // 週曆標頭顯示該週的年月
  const weekMonthLabel = week[0].key.slice(0, 7).replace('-', '/');

  // 翻週：往前不限（回看歷史日誌），往後最多到本週
  const changeWeek = (dir) => {
    const next = weekOffset + dir;
    if (next > 0) return;
    setWeekOffset(next);
    const nextWeek = getWeek(next);
    // 回到本週選今天，其他週選週一
    setSelectedKey(next === 0 ? dateKey() : nextWeek[0].key);
  };

  const backToToday = () => { setWeekOffset(0); setSelectedKey(dateKey()); };

  // ── 月曆選擇器 ──
  const todayKey = dateKey();

  // 連續紀錄天數（今天還沒記不中斷）
  let streak = 0;
  for (let i = 0; ; i++) {
    const has = dailyLogs[dateKey(-i)]?.meals?.length;
    if (has) streak++;
    else if (i > 0) break;
  }

  const openCalModal = () => {
    // 打開時跳到目前選中日期所在的月份
    const [y, m] = selectedKey.split('-').map(Number);
    setCalYM({ y, m: m - 1 });
    setShowCalModal(true);
  };

  const changeMonth = (dir) => {
    setCalYM(({ y, m }) => {
      const next = new Date(y, m + dir, 1);
      // 不能翻到未來的月份
      const now = new Date();
      if (next.getFullYear() > now.getFullYear() ||
          (next.getFullYear() === now.getFullYear() && next.getMonth() > now.getMonth())) {
        return { y, m };
      }
      return { y: next.getFullYear(), m: next.getMonth() };
    });
  };

  const isCurrentMonth = calYM.y === new Date().getFullYear() && calYM.m === new Date().getMonth();

  // 從月曆選日期：同步週曆的 weekOffset
  const pickDate = (key) => {
    const dayDiff = Math.round((Date.parse(key) - Date.parse(todayKey)) / 86400000);
    const todayDow = (new Date().getDay() + 6) % 7;
    setWeekOffset(Math.floor((dayDiff + todayDow) / 7));
    setSelectedKey(key);
    setShowCalModal(false);
  };

  // 左上角日期文字：星期四, 7月16（en: Thu, 7/16）
  const selDow = (() => {
    const [y, m, d] = selectedKey.split('-').map(Number);
    return (new Date(y, m - 1, d).getDay() + 6) % 7;
  })();
  const [, selM, selD] = selectedKey.split('-').map(Number);
  const headerDateLabel = lang === 'zh'
    ? `星期${t.weekDays[selDow]}, ${selM}月${selD}`
    : `${t.weekDays[selDow]}, ${selM}/${selD}`;

  const totals = getDayTotals(selectedKey) ?? { energy: 0, protein: 0, carbs: 0, fat: 0 };
  const mealsByType = getMealsByType(selectedKey);

  // 目標熱量 = TDEE + 目標模式增減；舊資料沒有 target 就退回 tdee
  const goal = profile?.target ?? profile?.tdee ?? null;

  const openGoalModal = () => {
    // profile.goal 可能是舊版/舊資料留下的無效值（例如舊版用過的 'lose'），
    // 這裡不是 GOAL_KEYS 三選一之一的話就退回 maintain，避免下面 GOAL_META[selGoal] 找不到整支炸掉
    setSelGoal(GOAL_KEYS.includes(profile?.goal) ? profile.goal : 'maintain');
    setSelActivity(profile?.activity ?? 'sedentary');
    setShowGoalModal(true);
  };

  // 依選擇重算：TDEE = BMR × 活動係數，目標 = TDEE + 模式增減；
  // activity 同步寫回 profile，與個人資料頁一致
  const saveGoal = () => {
    const factor = t.activities.find(l => l.key === selActivity)?.factor ?? 1.2;
    const tdee = profile.bmr * factor;
    updateProfile({
      ...profile,
      activity: selActivity,
      goal: selGoal,
      tdee,
      target: tdee + (GOAL_META[selGoal]?.delta ?? 0),
    });
    setShowGoalModal(false);
  };
  // 剩餘 = 目標 − 已攝取（＋運動消耗，Burned 尚無資料來源，待 Metrics 模組加入）
  const left = goal != null ? Math.round(goal - totals.energy) : null;

  // 三大營養素目標克數：與 profile 頁一致，固定 20/50/30 比例
  const macroTargets = goal != null ? {
    protein: Math.round((goal * 0.20) / 4),
    carbs:   Math.round((goal * 0.50) / 4),
    fat:     Math.round((goal * 0.30) / 9),
  } : null;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.dateDropdown} onPress={openCalModal} activeOpacity={0.7} hitSlop={6}>
            <Text style={s.dateDropdownText}>{headerDateLabel}</Text>
            <Ionicons name="caret-down" size={12} color={C.primaryDark} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t.diaryTitle}</Text>
        </View>

        {/* 週曆標頭：翻週 + 年月 + 回到今天 */}
        <View style={s.weekHeader}>
          <TouchableOpacity onPress={() => changeWeek(-1)} hitSlop={8} style={s.weekArrow}>
            <Ionicons name="chevron-back" size={18} color={C.primaryDark} />
          </TouchableOpacity>
          <View style={s.weekHeaderCenter}>
            <Text style={s.weekMonthLabel}>{weekMonthLabel}</Text>
            {(weekOffset !== 0 || selectedKey !== dateKey()) && (
              <TouchableOpacity style={s.todayChip} onPress={backToToday} activeOpacity={0.8}>
                <Text style={s.todayChipText}>{t.backToToday}</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => changeWeek(1)}
            hitSlop={8}
            style={[s.weekArrow, weekOffset === 0 && { opacity: 0.25 }]}
            disabled={weekOffset === 0}
          >
            <Ionicons name="chevron-forward" size={18} color={C.primaryDark} />
          </TouchableOpacity>
        </View>

        {/* 週曆 */}
        <View style={s.weekRow}>
          {week.map((d, i) => {
            const isSel = d.key === selectedKey;
            const hasLog = getDayTotals(d.key) != null;
            return (
              <TouchableOpacity key={d.key} style={s.dayBtn} onPress={() => setSelectedKey(d.key)} activeOpacity={0.7}>
                <Text style={s.weekDayLabel}>{t.weekDays[i]}</Text>
                <View style={[s.dayCircle, isSel && s.dayCircleSel, d.isToday && !isSel && s.dayCircleToday]}>
                  <Text style={[s.dayNum, isSel && s.dayNumSel]}>{d.dayNum}</Text>
                </View>
                <View style={[s.dayDot, hasLog && s.dayDotOn]} />
              </TouchableOpacity>
            );
          })}
        </View>

        {!profile && (
          <View style={s.card}>
            <Text style={s.noDataText}>{t.noDataYet}</Text>
          </View>
        )}

        {/* 熱量圓環 + 營養素進度 */}
        <View style={s.card}>
          <View style={s.ringRow}>
            <View style={s.ringSide}>
              <Text style={s.sideVal}>{Math.round(totals.energy)}</Text>
              <Text style={s.sideLabel}>{t.eatenLabel}</Text>
            </View>
            <View>
              <CalorieRing eaten={totals.energy} goal={goal}>
                <Text style={[s.ringNum, left != null && left < 0 && { color: C.surplus }]}>
                  {left ?? '—'}
                </Text>
                <Text style={s.ringUnit}>{t.leftLabel} kcal</Text>
              </CalorieRing>
              {profile && (
                <TouchableOpacity style={s.ringEditBtn} onPress={openGoalModal} activeOpacity={0.8} hitSlop={6}>
                  <Ionicons name="pencil" size={13} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
            <View style={s.ringSide}>
              <Text style={s.sideVal}>{goal != null ? Math.round(goal) : '—'}</Text>
              <Text style={s.sideLabel}>{t.goalLabel}</Text>
            </View>
          </View>

          {macroTargets && (
            <View style={s.macroSection}>
              <MacroProgress label={t.proteinShort} cur={totals.protein} target={macroTargets.protein} color={C.macroProtein} />
              <MacroProgress label={t.carbsShort}   cur={totals.carbs}   target={macroTargets.carbs}   color={C.macroCarbs}   />
              <MacroProgress label={t.fatShort}     cur={totals.fat}     target={macroTargets.fat}     color={C.macroFat}     />
            </View>
          )}
        </View>

        {/* 餐次列表 */}
        {MEAL_TYPES.map(type => (
          <MealSection
            key={type}
            type={type}
            meals={mealsByType[type]}
            goal={goal}
            t={t}
            onAdd={() => setAddTarget(type)}
            onRemove={(time) => removeMeal(selectedKey, time)}
          />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 新增食物 Modal：拍照辨識 */}
      {addTarget != null && (
      <Modal visible transparent animationType="slide" onRequestClose={() => setAddTarget(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setAddTarget(null)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={s.addModalCard}>
            <Text style={s.modalTitle}>
              {addTarget ? `${t[addTarget]}・` : ''}{t.addFoodTitle}
            </Text>

            <TouchableOpacity
              style={s.scanBtn}
              activeOpacity={0.85}
              onPress={() => {
                const type = addTarget;
                setAddTarget(null);
                router.push({ pathname: '/camera', params: { mealType: type } });
              }}
            >
              <Ionicons name="camera" size={20} color="#FFF" />
              <Text style={s.scanBtnText}>{t.scanFoodOption}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.uploadBtn}
              activeOpacity={0.85}
              onPress={() => {
                const type = addTarget;
                setAddTarget(null);
                router.push({ pathname: '/camera', params: { mealType: type, autoPick: '1' } });
              }}
            >
              <Ionicons name="cloud-upload-outline" size={20} color={C.primaryDark} />
              <Text style={s.uploadBtnText}>{t.uploadImage}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.uploadBtn}
              activeOpacity={0.85}
              onPress={() => {
                const type = addTarget;
                setAddTarget(null);
                router.push({ pathname: '/camera', params: { mealType: type, manual: '1' } });
              }}
            >
              <Ionicons name="create-outline" size={20} color={C.primaryDark} />
              <Text style={s.uploadBtnText}>{t.manualTextOption}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      )}

      {/* 月曆選擇器 Modal */}
      <Modal visible={showCalModal} transparent animationType="slide" onRequestClose={() => setShowCalModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.calModalCard}>
            {/* 頂列：今天 / 連續紀錄 / 關閉 */}
            <View style={s.calTopRow}>
              <TouchableOpacity style={s.calTodayBtn} onPress={() => pickDate(todayKey)} activeOpacity={0.8}>
                <Text style={s.calTodayBtnText}>{t.backToToday}</Text>
              </TouchableOpacity>
              <View style={s.calStreakBadge}>
                <Text style={s.calStreakText}>{t.currentStreak}</Text>
                <Text style={s.calStreakNum}>🔥 {streak}</Text>
              </View>
              <TouchableOpacity style={s.calCloseBtn} onPress={() => setShowCalModal(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* 月份切換 */}
            <View style={s.calMonthRow}>
              <TouchableOpacity onPress={() => changeMonth(-1)} hitSlop={10}>
                <Ionicons name="chevron-back" size={20} color={C.primaryDark} />
              </TouchableOpacity>
              <Text style={s.calMonthLabel}>
                {lang === 'zh' ? `${calYM.y}年${calYM.m + 1}月` : `${calYM.y}/${calYM.m + 1}`}
              </Text>
              <TouchableOpacity
                onPress={() => changeMonth(1)}
                hitSlop={10}
                disabled={isCurrentMonth}
                style={isCurrentMonth && { opacity: 0.25 }}
              >
                <Ionicons name="chevron-forward" size={20} color={C.primaryDark} />
              </TouchableOpacity>
            </View>

            {/* 星期標頭 */}
            <View style={s.calGrid}>
              {t.weekDays.map(w => (
                <View key={w} style={s.calCell}>
                  <Text style={s.calDowText}>{w}</Text>
                </View>
              ))}
            </View>

            {/* 日期格 */}
            <View style={s.calGrid}>
              {getMonthCells(calYM.y, calYM.m).map((cell, i) => {
                if (!cell) return <View key={`empty-${i}`} style={s.calCell} />;
                const isFuture = cell.key > todayKey;
                const totals = isFuture ? null : getDayTotals(cell.key);
                // 狀態圈：綠=有紀錄且達標、紅=超標、灰=無紀錄
                const ringColor = totals == null ? C.border
                  : goal != null && totals.energy > goal ? C.surplus
                  : C.primary;
                const isSel = cell.key === selectedKey;
                return (
                  <TouchableOpacity
                    key={cell.key}
                    style={s.calCell}
                    onPress={() => pickDate(cell.key)}
                    disabled={isFuture}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      s.calDayNum,
                      isFuture && { color: '#D1D5DB' },
                      cell.key === todayKey && { color: C.primaryDark },
                    ]}>
                      {cell.day}
                    </Text>
                    <View style={[
                      s.calRing,
                      { borderColor: isFuture ? '#F3F4F6' : ringColor },
                      isSel && s.calRingSel,
                    ]} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* 調整熱量目標 Modal */}
      <Modal visible={showGoalModal} transparent animationType="slide" onRequestClose={() => setShowGoalModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.goalModalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalTitle}>{t.adjustGoalTitle}</Text>

              {/* 目標模式 */}
              <Text style={s.modalSectionLabel}>{t.goalSectionLabel}</Text>
              <View style={s.goalRow}>
                {GOAL_KEYS.map(key => {
                  const isSel = selGoal === key;
                  const delta = GOAL_META[key].delta;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[s.goalOption, isSel && s.goalOptionActive]}
                      onPress={() => setSelGoal(key)}
                      activeOpacity={0.75}
                    >
                      <Text style={s.goalOptionEmoji}>{GOAL_META[key].emoji}</Text>
                      <Text style={[s.goalOptionLabel, isSel && s.goalOptionLabelActive]}>{goalLabel(t, key)}</Text>
                      <Text style={s.goalOptionDelta}>
                        {delta === 0 ? '±0' : (delta > 0 ? `+${delta}` : delta)} kcal
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 活動程度 */}
              <Text style={[s.modalSectionLabel, { marginTop: 16 }]}>{t.activityLevel}</Text>
              {t.activities.map(level => {
                const isSel = selActivity === level.key;
                return (
                  <TouchableOpacity
                    key={level.key}
                    style={[s.activityRow, isSel && s.activityRowActive]}
                    onPress={() => setSelActivity(level.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={s.activityEmoji}>{ACTIVITY_EMOJI[level.key] ?? '🏃'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.activityLabel, isSel && s.activityLabelActive]}>{level.label}</Text>
                      <Text style={s.activityDesc}>{level.desc}</Text>
                    </View>
                    {isSel && <Ionicons name="checkmark" size={20} color={C.primaryDark} />}
                  </TouchableOpacity>
                );
              })}

              {/* 預覽新目標 */}
              {profile && (
                <View style={s.goalPreview}>
                  <Text style={s.goalPreviewLabel}>{t.goalLabel}</Text>
                  <Text style={s.goalPreviewValue}>
                    {Math.round(profile.bmr * (t.activities.find(l => l.key === selActivity)?.factor ?? 1.2) + (GOAL_META[selGoal]?.delta ?? 0))} kcal
                  </Text>
                </View>
              )}

              <View style={s.modalButtonRow}>
                <TouchableOpacity style={[s.modalBtn, s.modalCancelBtn]} onPress={() => setShowGoalModal(false)}>
                  <Text style={s.modalBtnText}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalBtn, s.modalSaveBtn]} onPress={saveGoal}>
                  <Text style={s.modalBtnText}>{t.saveLabel}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 20 },

  /* Header */
  header:      { alignItems: 'center', paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5, textAlign: 'center' },
  dateDropdown: {
    position: 'absolute', top: 20, left: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  dateDropdownText: { fontSize: 12, fontWeight: '700', color: C.textPrimary },

  /* 月曆 Modal */
  calModalCard: {
    width: '100%', maxHeight: '88%', backgroundColor: C.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20,
  },
  calTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  calTodayBtn: {
    backgroundColor: '#ECFDF5', borderRadius: 999, borderWidth: 1, borderColor: '#A7F3D0',
    paddingHorizontal: 14, paddingVertical: 7,
  },
  calTodayBtnText: { fontSize: 13, fontWeight: '700', color: C.primaryDark },
  calStreakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F9FAFB', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
  },
  calStreakText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  calStreakNum:  { fontSize: 14, fontWeight: '900', color: C.textPrimary },
  calCloseBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  calMonthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 24, paddingVertical: 12,
  },
  calMonthLabel: { fontSize: 17, fontWeight: '800', color: C.textPrimary },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%`, alignItems: 'center',
    paddingVertical: 8, gap: 5,
  },
  calDowText: { fontSize: 12, fontWeight: '700', color: C.textSecondary },
  calDayNum:  { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  calRing: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 4.5,
    backgroundColor: 'transparent',
  },
  calRingSel: { transform: [{ scale: 1.18 }] },

  /* 週曆標頭 */
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  weekArrow: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center',
  },
  weekHeaderCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekMonthLabel:   { fontSize: 14, fontWeight: '800', color: C.textPrimary },
  todayChip: {
    backgroundColor: '#ECFDF5', borderRadius: 999, borderWidth: 1, borderColor: '#A7F3D0',
    paddingHorizontal: 10, paddingVertical: 3,
  },
  todayChipText: { fontSize: 11, fontWeight: '700', color: C.primaryDark },

  /* 週曆 */
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  dayBtn:  { alignItems: 'center', flex: 1, gap: 6 },
  dayDot:   { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  dayDotOn: { backgroundColor: C.primary },
  weekDayLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary },
  dayCircle: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  dayCircleSel:   { backgroundColor: C.primaryDark },
  dayCircleToday: { borderWidth: 2, borderColor: C.primary },
  dayNum:    { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  dayNumSel: { color: '#FFF' },

  /* Cards */
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

  /* 熱量圓環 */
  ringRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  ringSide: { alignItems: 'center', width: 70 },
  sideVal:   { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  sideLabel: { fontSize: 11, fontWeight: '600', color: C.textSecondary, marginTop: 2 },
  ring: {
    width: RING_SIZE, height: RING_SIZE, justifyContent: 'center', alignItems: 'center',
  },
  ringNum:  { fontSize: 30, fontWeight: '900', color: C.primaryDark },
  ringUnit: { fontSize: 11, color: C.textSecondary, fontWeight: '600', marginTop: 2 },
  ringEditBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14, backgroundColor: C.primaryDark,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },

  /* 營養素進度 */
  macroSection: { gap: 10, marginTop: 18 },
  macroWrap:  {},
  macroTop:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  macroLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  macroVal:   { fontSize: 12, fontWeight: '800' },
  barBg:   { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4 },
  barFill: { height: 8, borderRadius: 4 },

  /* 餐次卡片 */
  mealCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  mealEmoji:  { fontSize: 26 },
  mealName:   { fontSize: 14, fontWeight: '800', color: C.textPrimary },
  mealKcal:   { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginTop: 1 },
  addBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center', marginLeft: 4,
  },
  mealItemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  mealItemName: { flex: 1, fontSize: 13, fontWeight: '600', color: C.textPrimary },
  mealItemKcal: { fontSize: 12, fontWeight: '700', color: C.textSecondary },
  noMeals: { fontSize: 12, color: C.textSecondary, fontStyle: 'italic', marginTop: 10, textAlign: 'center' },

  /* 新增食物 Modal */
  addModalCard: {
    width: '100%', maxHeight: '80%', backgroundColor: C.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20,
  },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primaryDark, borderRadius: 16, paddingVertical: 15, marginBottom: 18,
  },
  scanBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F0FDF4', borderRadius: 16, borderWidth: 1.5, borderColor: C.primary,
    paddingVertical: 14, marginTop: 10,
  },
  uploadBtnText: { color: C.primaryDark, fontSize: 15, fontWeight: '800' },

  /* 調整目標 Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  goalModalCard: {
    width: '100%', maxHeight: '85%', backgroundColor: C.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: C.textPrimary, marginBottom: 16, textAlign: 'center' },
  modalSectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },

  goalRow: { flexDirection: 'row', gap: 10 },
  goalOption: {
    flex: 1, alignItems: 'center', gap: 3,
    paddingVertical: 14, borderRadius: 16,
    backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: 'transparent',
  },
  goalOptionActive:      { borderColor: C.primary, backgroundColor: '#F0FDF4' },
  goalOptionEmoji:       { fontSize: 24 },
  goalOptionLabel:       { fontSize: 14, fontWeight: '800', color: C.textPrimary },
  goalOptionLabelActive: { color: C.primaryDark },
  goalOptionDelta:       { fontSize: 11, fontWeight: '700', color: C.textSecondary },

  activityRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16,
    backgroundColor: '#F9FAFB', marginBottom: 8, gap: 12,
    borderWidth: 2, borderColor: 'transparent',
  },
  activityRowActive:   { borderColor: C.primary, backgroundColor: '#F0FDF4' },
  activityEmoji:       { fontSize: 24, width: 32, textAlign: 'center' },
  activityLabel:       { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  activityLabelActive: { color: C.primaryDark },
  activityDesc:        { fontSize: 12, color: C.textSecondary, marginTop: 2 },

  goalPreview: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#ECFDF5', borderRadius: 14, borderWidth: 1, borderColor: '#A7F3D0',
    paddingVertical: 12, paddingHorizontal: 16, marginTop: 14,
  },
  goalPreviewLabel: { fontSize: 13, fontWeight: '700', color: C.textSecondary },
  goalPreviewValue: { fontSize: 18, fontWeight: '900', color: C.primaryDark },

  modalButtonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn:       { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  modalCancelBtn: { backgroundColor: '#9CA3AF', flex: 0, paddingHorizontal: 24 },
  modalSaveBtn:   { backgroundColor: C.primary },
  modalBtnText:   { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
