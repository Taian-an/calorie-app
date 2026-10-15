import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, ScrollView, SafeAreaView, Modal, Animated, PanResponder, Pressable,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useLanguage } from '../../context/LanguageContext';
import { useUserData, dateKey, dateKeyOf, MEAL_TYPES } from '../../context/UserDataContext';
import { catchUpPlan, macroTargets as goalMacroTargets, adaptiveCheck, MACRO_RULE_FOR, planStatusOf, calorieMinimum, ADAPT } from '../../constants/bodyCalc';
import { daysBetween } from '../../constants/goalPlan';
import { formatPlanDate } from '../../components/GoalPlanSummary';
import { usePreferences } from '../../context/PreferencesContext';
import { formatWeight } from '../../constants/units';
import { entryPhotoUri } from '../../constants/nutrition';
import { useAddFood } from '../../components/AddFoodSheet';
import { useTheme, useStyles } from '../../context/PreferencesContext';


const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_SIZE = 132;
const RING_STROKE = 9;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// 熱量圓環：隨已攝取熱量逐步畫出，達標時剛好形成閉環；超過目標則整圈變橘色示警
function CalorieRing({ eaten, goal, children }) {
  const { C } = useTheme();
  const s = useStyles(makeStyles);
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
          stroke={C.border} strokeWidth={RING_STROKE} fill="none"
        />
        <AnimatedCircle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
          stroke={isOver ? C.warn : C.primary} strokeWidth={RING_STROKE} fill="none"
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

const goalLabel = (t, key) =>
  key === 'bulk' ? t.goalMuscle : key === 'cut' ? t.goalFat : t.goalMaintain;

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
    cells.push({ day, key: dateKeyOf(new Date(year, month, day)) });
  }
  return cells;
}

function MacroProgress({ label, cur, target, color }) {
  const s = useStyles(makeStyles);
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

// 一個餐次卡片。食物紀錄長按後可以拖到另一個餐次（拖曳本身由 DiaryScreen 處理，這裡只回報起點和卡片位置）
function MealSection({ type, meals, goal, t, open, onToggle, onAdd, onRemove, onOpenEntry, cardRef, isDropTarget, draggingTime, onDragStart, onPressOut }) {
  const { C } = useTheme();
  const s = useStyles(makeStyles);
  const subtotal = Math.round(meals.reduce((sum, m) => sum + (m.energy || 0), 0));
  const target = goal != null ? Math.round(goal * MEAL_META[type].share) : null;
  const pct = target ? Math.min(subtotal / target, 1) * 100 : 0;

  return (
    <View ref={cardRef} collapsable={false} style={[s.mealCard, isDropTarget && s.mealCardDrop]}>
      <TouchableOpacity style={s.mealHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={s.mealName}>{t[type]}</Text>
          <Text style={s.mealKcal}>
            {subtotal}{target != null ? ` / ${target}` : ''} kcal
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.textSecondary} />
        <TouchableOpacity style={s.addBtn} onPress={onAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color={C.onPrimary} />
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: C.primary }]} />
      </View>

      {open && (
        meals.length ? meals.map(m => (
          <Pressable
            key={m.time}
            style={[s.mealItemRow, draggingTime === m.time && { opacity: 0.3 }]}
            delayLongPress={300}
            onPress={() => onOpenEntry(m)}
            onLongPress={e => onDragStart(m, type, e.nativeEvent)}
            onPressOut={onPressOut}
            accessibilityHint={t.dragToMoveHint}
          >
            {entryPhotoUri(m) ? (
              <Image source={{ uri: entryPhotoUri(m) }} style={s.mealThumb} />
            ) : (
              <View style={[s.mealThumb, s.mealThumbEmpty]}>
                <Ionicons name="restaurant-outline" size={20} color={C.textMuted} />
              </View>
            )}
            <View style={s.mealItemInfo}>
              <Text style={s.mealItemName} numberOfLines={1}>{m.name}</Text>
              <View style={s.mealItemMacros}>
                <Text style={[s.mealItemMacro, { color: C.macroProtein }]}>{t.macroP} {Math.round(m.protein || 0)}g</Text>
                <Text style={[s.mealItemMacro, { color: C.macroCarbs }]}>{t.macroC} {Math.round(m.carbs || 0)}g</Text>
                <Text style={[s.mealItemMacro, { color: C.macroFat }]}>{t.macroF} {Math.round(m.fat || 0)}g</Text>
              </View>
            </View>
            <Text style={s.mealItemKcal}>{Math.round(m.energy || 0)}<Text style={s.mealItemKcalUnit}> kcal</Text></Text>
            <TouchableOpacity onPress={() => onRemove(m.time)} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={C.macroFat} />
            </TouchableOpacity>
          </Pressable>
        )) : (
          <Text style={s.noMeals}>{t.noMealsLogged}</Text>
        )
      )}
    </View>
  );
}

// 每日目標怎麼來：BMR → TDEE → Goal 增減 → 動態調整 → 目標，帶入使用者自己的數字。
// 動態調整還沒開始的話，顯示還差多少資料
function TargetInfoModal({ profile, dailyLogs, t, lang, onClose }) {
  const s = useStyles(makeStyles);
  const n = v => Math.round(v).toLocaleString();
  const signed = v => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${n(Math.abs(v))}`;
  const activity = t.activities.find(a => a.key === profile.activity);
  const { units } = usePreferences();
  const today = dateKey();
  const { goalChange: goalDelta, planStatus } = planStatusOf(profile, today);
  const timelineSub = planStatus === 'maintain'
    ? t.targetInfoGoalMaintain
    : planStatus === 'ok'
      ? t.targetInfoGoalPlan
        .replace('{kg}', formatWeight(Math.abs(profile.targetWeight - profile.weight), units))
        .replace('{date}', formatPlanDate(profile.goalDate, lang))
        .replace('{w}', Math.round((daysBetween(today, profile.goalDate) / 7) * 10) / 10)
      : planStatus === 'needs_review' ? t.targetInfoGoalReview : t.targetInfoGoalLegacy;
  const minimum = calorieMinimum(profile.gender) ?? calorieMinimum('other');
  const adjustment = profile.targetAdjustment ?? 0;
  const check = adaptiveCheck(profile, dailyLogs, dateKey());
  const rule = MACRO_RULE_FOR(profile.goal);

  const rows = [
    { label: t.targetInfoBmr, sub: t.targetInfoBmrSub, value: `${n(profile.bmr)} kcal` },
    { label: t.targetInfoTdee, sub: t.targetInfoTdeeSub.replace('{a}', activity?.label ?? '').replace('{f}', activity?.factor ?? 1.2), value: `${n(profile.tdee)} kcal` },
    { label: t.targetInfoGoal.replace('{goal}', goalLabel(t, profile.goal)), sub: timelineSub, value: `${signed(goalDelta)} kcal` },
    {
      label: t.targetInfoAdaptive,
      sub: adjustment
        ? t.targetInfoAdaptiveOn
        : t.targetInfoAdaptiveWaiting
          .replace('{d}', check.loggedDays ?? 0).replace('{dn}', ADAPT.minLoggedDays)
          .replace('{w}', check.weighSpanDays ?? 0).replace('{wn}', ADAPT.minSpanDays),
      value: `${signed(adjustment)} kcal`,
    },
  ];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={s.infoCard}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.modalTitle}>{t.targetInfoTitle}</Text>
            {rows.map((r, i) => (
              <View key={i} style={[s.infoRow, s.infoRowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.infoLabel}>{r.label}</Text>
                  <Text style={s.infoSub}>{r.sub}</Text>
                </View>
                <Text style={s.infoValue}>{r.value}</Text>
              </View>
            ))}
            <View style={[s.infoRow, s.infoTotal]}>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>{t.targetInfoTarget}</Text>
                <Text style={s.infoSub}>{t.targetInfoTargetSub.replace('{min}', minimum)}</Text>
              </View>
              <Text style={s.infoTotalValue}>{n(profile.target)} kcal</Text>
            </View>
            <Text style={s.infoNote}>
              {t.targetInfoMacros.replace('{p}', rule.proteinPerKg).replace('{f}', Math.round(rule.fatShare * 100))}
            </Text>
            <Text style={s.infoNote}>{t.targetInfoAdaptiveNote}</Text>
            <TouchableOpacity style={s.infoCloseBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={s.infoCloseText}>{t.doneLabel}</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function DiaryScreen() {
  const { C } = useTheme();
  const s = useStyles(makeStyles);
  const { lang, t } = useLanguage();
  const { profile, dailyLogs, getDayTotals, getMealsByType, removeMeal, moveMeal, refreshLogs } = useUserData();

  // 回到日誌頁就跟雲端對一次，另一台裝置（手機 / 網頁版）剛記的食物才會出現
  useFocusEffect(
    useCallback(() => {
      refreshLogs().catch(err => console.warn('[sync] pull failed:', err.message));
    }, [refreshLogs])
  );
  const [selectedKey, setSelectedKey] = useState(dateKey());
  const [weekOffset, setWeekOffset] = useState(0);
  const [showTargetInfo, setShowTargetInfo] = useState(false);
  const [showCalModal, setShowCalModal] = useState(false);
  const [calYM, setCalYM] = useState({ y: new Date().getFullYear(), m: new Date().getMonth() });
  const { open: openAddFood } = useAddFood(); // 新增食物選單（跟底部導覽列的相機鈕共用）
  const [openTypes, setOpenTypes] = useState({}); // 哪些餐次卡片是展開的

  // 長按食物紀錄後拖到另一個餐次：放開時手指落在哪張餐次卡片上，就移到那個餐次（只在同一天內移動）
  const [drag, setDrag] = useState(null); // { meal, fromType, overType }
  const dragRef = useRef(null);
  const grabbedRef = useRef(false); // 拖曳手勢是否已經從 Pressable 接手
  const cardRefs = useRef({});
  const cardRects = useRef({});
  const screenRef = useRef(null);
  const screenTop = useRef(0);
  const ghostY = useRef(new Animated.Value(0)).current;

  const toggleOpen = (type) => setOpenTypes(o => ({ ...o, [type]: !o[type] }));

  const typeAt = (pageY) =>
    MEAL_TYPES.find(type => {
      const r = cardRects.current[type];
      return r && pageY >= r.y && pageY <= r.y + r.height;
    }) ?? null;

  const updateDrag = (next) => {
    dragRef.current = next;
    setDrag(next);
  };

  const startDrag = (meal, fromType, { pageY }) => {
    grabbedRef.current = false;
    screenRef.current?.measureInWindow((x, y) => { screenTop.current = y; ghostY.setValue(pageY - y - 22); });
    for (const type of MEAL_TYPES) {
      cardRefs.current[type]?.measureInWindow((x, y, width, height) => {
        cardRects.current[type] = { y, height };
      });
    }
    updateDrag({ meal, fromType, overType: fromType });
  };

  const endDrag = (drop) => {
    const d = dragRef.current;
    if (!d) return;
    if (drop && d.overType && d.overType !== d.fromType) {
      moveMeal(selectedKey, d.meal.time, d.overType);
      setOpenTypes(o => ({ ...o, [d.overType]: true })); // 展開目的地，讓使用者看到它移過去了
    }
    updateDrag(null);
  };
  // PanResponder 只建立一次，透過 ref 拿到最新的 endDrag（裡面用到目前選的日期）
  const endDragRef = useRef(endDrag);
  endDragRef.current = endDrag;

  const dragResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: () => !!dragRef.current,
    onPanResponderGrant: () => { grabbedRef.current = true; },
    onPanResponderMove: (e, g) => {
      ghostY.setValue(g.moveY - screenTop.current - 22);
      const over = typeAt(g.moveY);
      if (dragRef.current && over !== dragRef.current.overType) updateDrag({ ...dragRef.current, overType: over });
    },
    onPanResponderRelease: () => endDragRef.current(true),
    onPanResponderTerminate: () => endDragRef.current(false),
    onPanResponderTerminationRequest: () => false,
  })).current;

  // 長按後沒移動就放開：手勢沒交給拖曳處理，在這裡取消
  const onRowPressOut = () => {
    setTimeout(() => { if (!grabbedRef.current) endDragRef.current(false); }, 0);
  };

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

  // 剩餘 = 目標 − 已攝取（＋運動消耗，Burned 尚無資料來源，待 Metrics 模組加入）
  const left = goal != null ? Math.round(goal - totals.energy) : null;

  // 只在看「今天」時給建議：
  // 1) 今天已經吃滿目標 → 告訴使用者接下來怎麼辦（還餓的話吃什麼、多的會分幾天補回來）
  // 2) 昨天吃超過目標 → 建議接下來幾天每天少吃一點，慢慢補回來
  const isToday = selectedKey === todayKey;
  const fullToday = isToday && left != null && totals.energy > 0 && left <= 0;
  const yesterdayKey = dateKey(-1);
  const yesterdayTotals = getDayTotals(yesterdayKey);
  const yesterdayTarget = dailyLogs[yesterdayKey]?.target ?? goal;
  const catchUp = isToday && yesterdayTotals && yesterdayTarget != null
    ? catchUpPlan(yesterdayTotals.energy - yesterdayTarget, goal)
    : null;
  const askCoach = (q) => router.push({ pathname: '/coach', params: { q } });

  // 三大營養素目標依 Goal 決定（見 constants/bodyCalc.js 的 macroTargets）
  const macroTargets = goalMacroTargets(goal, profile?.weight, profile?.goal);

  // 最近 3 天內目標熱量被動態調整過：在今天的日誌上說明一次
  const recentAdjustment = isToday && profile?.lastAdjustment && profile?.targetAdjustedAt
    && profile.targetAdjustedAt >= dateKey(-3) ? profile.lastAdjustment : null;

  return (
    <SafeAreaView style={s.safe}>
      <View ref={screenRef} style={{ flex: 1 }} collapsable={false} {...dragResponder.panHandlers}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} scrollEnabled={!drag}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.dateDropdown} onPress={openCalModal} activeOpacity={0.7} hitSlop={6}>
            <Text style={s.dateDropdownText}>{headerDateLabel}</Text>
            <Ionicons name="caret-down" size={12} color={C.primaryDark} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t.diaryTitle}</Text>
          {profile && (
            <TouchableOpacity
              style={s.infoBtn}
              onPress={() => setShowTargetInfo(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t.targetInfoTitle}
            >
              <Ionicons name="information-circle-outline" size={24} color={C.primaryDark} />
            </TouchableOpacity>
          )}
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

        {/* Goal plan 超出安全範圍（體重變了、時間快到、已達目標體重）：請使用者重新設定 */}
        {isToday && profile && planStatusOf(profile).planStatus === 'needs_review' && (
          <TouchableOpacity style={[s.tipCard, s.tipCardWarn]} onPress={() => router.push('/goal')} activeOpacity={0.85} accessibilityRole="button">
            <Text style={s.tipTitle}>{t.goalReviewTitle}</Text>
            <Text style={s.tipBody}>{t.goalReviewBody}</Text>
          </TouchableOpacity>
        )}

        {/* 目標熱量剛被動態調整過 */}
        {recentAdjustment != null && (
          <TouchableOpacity style={s.tipCard} onPress={() => setShowTargetInfo(true)} activeOpacity={0.85}>
            <Text style={s.tipTitle}>
              {t.tipAdjustedTitle.replace('{n}', `${recentAdjustment > 0 ? '+' : ''}${recentAdjustment}`)}
            </Text>
            <Text style={s.tipBody}>
              {t.tipAdjustedBody
                .replace('{dir}', recentAdjustment > 0 ? t.dirHigher : t.dirLower)
                .replace('{t}', Math.round(goal))}
            </Text>
          </TouchableOpacity>
        )}

        {/* 吃滿目標 / 昨天吃超過：給下一步的建議 */}
        {fullToday && (
          <View style={[s.tipCard, s.tipCardWarn]}>
            <Text style={s.tipTitle}>
              {left === 0 ? t.tipFullTitle : t.tipOverTitle.replace('{n}', Math.abs(left))}
            </Text>
            <Text style={s.tipBody}>{t.tipFullBody}</Text>
            <TouchableOpacity style={s.tipBtn} onPress={() => askCoach(t.tipFullAsk)} activeOpacity={0.8}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color={C.primaryDark} />
              <Text style={s.tipBtnText}>{t.tipAskCoach}</Text>
            </TouchableOpacity>
          </View>
        )}
        {catchUp && (
          <View style={s.tipCard}>
            <Text style={s.tipTitle}>{t.tipYesterdayTitle.replace('{n}', catchUp.surplus)}</Text>
            <Text style={s.tipBody}>
              {catchUp.perDay > 0
                ? t.tipCatchUpBody
                    .replace('{d}', catchUp.days)
                    .replace('{p}', catchUp.perDay)
                    .replace('{a}', catchUp.adjusted)
                : t.tipCatchUpMoveBody}
            </Text>
            <TouchableOpacity
              style={s.tipBtn}
              onPress={() => askCoach(t.tipCatchUpAsk.replace('{n}', catchUp.surplus))}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={14} color={C.primaryDark} />
              <Text style={s.tipBtnText}>{t.tipAskCoach}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 餐次列表 */}
        {MEAL_TYPES.map(type => (
          <MealSection
            key={type}
            type={type}
            meals={mealsByType[type]}
            goal={goal}
            t={t}
            open={!!openTypes[type]}
            onToggle={() => toggleOpen(type)}
            onAdd={() => openAddFood(type)}
            onRemove={(time) => removeMeal(selectedKey, time)}
            onOpenEntry={(m) => router.push({ pathname: '/entry', params: { date: selectedKey, time: String(m.time) } })}
            cardRef={el => { cardRefs.current[type] = el; }}
            isDropTarget={!!drag && drag.overType === type && type !== drag.fromType}
            draggingTime={drag?.meal.time}
            onDragStart={startDrag}
            onPressOut={onRowPressOut}
          />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 拖曳中跟著手指移動的那筆食物 */}
      {drag && (
        <Animated.View pointerEvents="none" style={[s.dragGhost, { transform: [{ translateY: ghostY }] }]}>
          <Ionicons name="reorder-two-outline" size={16} color={C.primaryDark} />
          <Text style={[s.mealItemName, { flex: 1 }]} numberOfLines={1}>{drag.meal.name}</Text>
          <Text style={s.mealItemKcal}>{Math.round(drag.meal.energy || 0)} kcal</Text>
        </Animated.View>
      )}
      </View>

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
                      isFuture && { color: C.borderStrong },
                      cell.key === todayKey && { color: C.primaryDark },
                    ]}>
                      {cell.day}
                    </Text>
                    <View style={[
                      s.calRing,
                      { borderColor: isFuture ? C.muted : ringColor },
                      isSel && s.calRingSel,
                    ]} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* 每日目標的計算公式（右上角 info） */}
      {showTargetInfo && profile && (
        <TargetInfoModal profile={profile} dailyLogs={dailyLogs} t={t} lang={lang} onClose={() => setShowTargetInfo(false)} />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 20 },

  /* Header */
  header:      { alignItems: 'center', paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5, textAlign: 'center' },
  infoBtn: { position: 'absolute', top: 22, right: 0, zIndex: 10 },
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
    backgroundColor: C.tint, borderRadius: 999, borderWidth: 1, borderColor: C.tintStrong,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  calTodayBtnText: { fontSize: 13, fontWeight: '700', color: C.primaryDark },
  calStreakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.subtle, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
  },
  calStreakText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  calStreakNum:  { fontSize: 14, fontWeight: '900', color: C.textPrimary },
  calCloseBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.muted,
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
    backgroundColor: C.tint, borderRadius: 999, borderWidth: 1, borderColor: C.tintStrong,
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
  dayNumSel: { color: C.onPrimary },

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
  /* 建議卡片（吃滿目標 / 昨天吃超過） */
  tipCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: C.primary,
  },
  tipCardWarn: { borderLeftColor: C.warn },
  tipTitle: { fontSize: 14, fontWeight: '800', color: C.textPrimary, marginBottom: 6 },
  tipBody:  { fontSize: 13, color: C.textSecondary, lineHeight: 19 },
  tipBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    marginTop: 10, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: C.bg,
  },
  tipBtnText: { fontSize: 12, fontWeight: '700', color: C.primaryDark },
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

  /* 營養素進度 */
  macroSection: { gap: 10, marginTop: 18 },
  macroWrap:  {},
  macroTop:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  macroLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  macroVal:   { fontSize: 12, fontWeight: '800' },
  barBg:   { height: 8, backgroundColor: C.muted, borderRadius: 4 },
  barFill: { height: 8, borderRadius: 4 },

  /* 餐次卡片 */
  mealCard: {
    backgroundColor: C.card, borderRadius: 18, padding: 18, marginBottom: 14,
    borderWidth: 2, borderColor: 'transparent', // 拖曳時目的地卡片改成綠框，平常留透明框避免版面跳動
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  mealCardDrop: { borderColor: C.primary, backgroundColor: C.bg },
  dragGhost: {
    position: 'absolute', left: 20, right: 20, top: 0,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.primary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  mealEmoji:  { fontSize: 26 },
  mealName:   { fontSize: 17, fontWeight: '800', color: C.textPrimary },
  mealKcal:   { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginTop: 2 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center', marginLeft: 4,
  },
  mealItemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.muted,
  },
  mealThumb:      { width: 52, height: 52, borderRadius: 12, backgroundColor: C.muted },
  mealThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  mealItemInfo:   { flex: 1, minWidth: 0 },
  mealItemName:   { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  mealItemMacros: { flexDirection: 'row', gap: 10, marginTop: 4 },
  mealItemMacro:  { fontSize: 12, fontWeight: '700' },
  mealItemKcal:   { fontSize: 16, fontWeight: '800', color: C.textPrimary },
  mealItemKcalUnit: { fontSize: 11, fontWeight: '600', color: C.textSecondary },
  noMeals: { fontSize: 12, color: C.textSecondary, fontStyle: 'italic', marginTop: 10, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: C.textPrimary, marginBottom: 16, textAlign: 'center' },

  /* 每日目標公式 */
  infoCard: {
    width: '100%', maxHeight: '85%', backgroundColor: C.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  infoLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: C.textPrimary },
  infoSub: { fontSize: 12, color: C.textSecondary, marginTop: 3, lineHeight: 17, fontWeight: '500' },
  infoValue: { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  infoTotal: { borderTopWidth: 2, borderTopColor: C.primary, marginTop: 4 },
  infoTotalValue: { fontSize: 18, fontWeight: '900', color: C.primaryDark },
  infoNote: { fontSize: 12, color: C.textSecondary, lineHeight: 18, marginTop: 12 },
  infoCloseBtn: { marginTop: 18, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: C.primary },
  infoCloseText: { fontSize: 15, fontWeight: '800', color: C.onPrimary },
});
