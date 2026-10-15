// 身體數據的計算：onboarding、個人資料編輯、每年自動更新年齡都走這裡，確保同一套公式。
// BMR、TDEE、Goal plan 的驗證和熱量 / 營養素目標在 constants/goalPlan.js（跟後端共用同一份），這裡只是轉接
import {
  GOAL_POLICY, calcBmr, activityFactor, daysBetween, addDays,
  resolveDailyTarget, calculateMacroTargets, calorieMinimum,
} from './goalPlan';

export { calcBmr, activityFactor, daysBetween };

// 'other' = 其他 / 不願透露。公式本身只分男女，選 other 時取兩條公式的平均，誤差會比選男/女大一點
export const GENDER_KEYS = ['male', 'female', 'other'];

// 今天（裝置當地日期，GLOSSARY「Day」）
export function todayKey() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 問卷用：目標體重比目前重 → 增肌、比目前輕 → 減脂、差不到 0.3 kg → 維持。之後在 Goal plan 頁可以自己選
export function goalFromWeights(weight, targetWeight) {
  if (weight == null || targetWeight == null) return null;
  const tol = GOAL_POLICY.maintainToleranceKg;
  return targetWeight > weight + tol ? 'bulk' : targetWeight < weight - tol ? 'cut' : 'maintain';
}

// 身體資料或 Goal plan 改了就用這支重算整份 profile：BMR → TDEE → 目標熱量（resolveDailyTarget）。
// Goal 是使用者選的，這裡不改；動態調整的累計值保留，不因為改資料歸零
export function recalcProfile(p, today = todayKey()) {
  const bmr = calcBmr(p.gender, p.weight, p.height, p.age);
  const tdee = bmr * activityFactor(p.activity);
  const goal = ['cut', 'bulk', 'maintain'].includes(p.goal)
    ? p.goal
    : goalFromWeights(p.weight, p.targetWeight) ?? 'maintain';
  const next = { ...p, bmr, tdee, goal };
  return { ...next, target: resolveDailyTarget(next, today).target };
}

// 目前 Goal plan 的狀態（'ok' | 'needs_review' | 'no_plan' | 'maintain'）和驗證結果，給畫面顯示用
export function planStatusOf(profile, today = todayKey()) {
  if (profile?.tdee == null) return { planStatus: 'no_plan', validation: null, goalChange: 0 };
  return resolveDailyTarget(profile, today);
}

// 三大營養素目標（見 goalPlan.js 的 calculateMacroTargets）
export function macroTargets(target, weightKg, goal) {
  if (target == null) return null;
  return calculateMacroTargets({ calories: target, weightKg, goalType: goal });
}
export const MACRO_RULE_FOR = (goal) => GOAL_POLICY.macros[goal] ?? GOAL_POLICY.macros.maintain;
export const KCAL_PER_KG = GOAL_POLICY.kcalPerKg;
export { calorieMinimum };

// ── Weight trend（見 GLOSSARY）：用 7 日平均體重判斷增減，不看單日數字 ─────────
// 回傳每次量體重的那天和「那天往前 7 天內所有量測的平均」，依日期排序
export function weightTrend(dailyLogs) {
  const weighIns = Object.keys(dailyLogs)
    .filter(k => typeof dailyLogs[k]?.weight === 'number')
    .sort()
    .map(k => ({ date: k, weight: dailyLogs[k].weight }));
  return weighIns.map(p => {
    const win = weighIns.filter(q => q.date <= p.date && daysBetween(q.date, p.date) < 7);
    return { ...p, avg: win.reduce((sum, q) => sum + q.weight, 0) / win.length };
  });
}

// ── Adaptive adjustment（見 GLOSSARY）──────────────────────────────────
// 累積 2–4 週資料後，用「實際吃了多少」和「7 日平均體重怎麼變」反推真正的 TDEE，
// 再把目標熱量往「該有的數字」小幅移動。每 14 天最多調一次、每次最多 ±100 kcal、累計最多 ±400 kcal。
export const ADAPT = {
  windowDays: 28,   // 只看最近 4 週
  minLoggedDays: 14, // 至少 2 週有完整記錄的 Day
  minSpanDays: 14,   // 第一次和最後一次量體重至少隔 2 週
  intervalDays: 14,  // 兩次調整之間至少隔 2 週
  stepMax: 100,
  totalMax: 400,
  minChange: 50,     // 差不到 50 kcal 就不調
};

export function adaptiveCheck(profile, dailyLogs, todayKey) {
  if (!profile?.tdee || profile.target == null) return { ready: false };
  const from = addDays(todayKey, -ADAPT.windowDays);
  const inWindow = k => k >= from && k < todayKey; // 今天還沒吃完，不算

  // 只算「有好好記錄」的 Day：吃到目標一半以上，避免漏記的天數把 TDEE 估得太低
  const logged = Object.keys(dailyLogs).filter(inWindow).map(k => {
    const energy = (dailyLogs[k]?.meals ?? []).reduce((sum, m) => sum + (m.energy || 0), 0);
    return { k, energy };
  }).filter(d => d.energy >= profile.target * 0.5);

  const trend = weightTrend(dailyLogs).filter(p => inWindow(p.date) || p.date === todayKey);
  const span = trend.length >= 2 ? daysBetween(trend[0].date, trend[trend.length - 1].date) : 0;
  const status = { loggedDays: logged.length, weighSpanDays: span };
  if (logged.length < ADAPT.minLoggedDays || span < ADAPT.minSpanDays) return { ready: false, ...status };

  // 起點用前 7 天的平均，終點用最後一天的 7 日平均
  const first = trend[0].date;
  const startPts = trend.filter(p => daysBetween(first, p.date) < 7);
  const startAvg = startPts.reduce((sum, p) => sum + p.weight, 0) / startPts.length;
  const endAvg = trend[trend.length - 1].avg;
  const avgIntake = logged.reduce((sum, d) => sum + d.energy, 0) / logged.length;
  const estimatedTdee = avgIntake - ((endAvg - startAvg) * KCAL_PER_KG) / span;
  const ideal = estimatedTdee + resolveDailyTarget({ ...profile, targetAdjustment: 0 }, todayKey).goalChange;
  return { ready: true, ...status, startAvg, endAvg, avgIntake, estimatedTdee, ideal };
}

// 該調整的話回傳更新後的 profile，不用調整回傳 null
export function adaptedProfile(profile, dailyLogs, todayKey) {
  if (profile?.targetAdjustedAt && daysBetween(profile.targetAdjustedAt, todayKey) < ADAPT.intervalDays) return null;
  const check = adaptiveCheck(profile, dailyLogs, todayKey);
  if (!check.ready) return null;
  const current = profile.targetAdjustment ?? 0;
  const diff = check.ideal - profile.target;
  if (Math.abs(diff) < ADAPT.minChange) return null;
  const nextTotal = Math.max(-ADAPT.totalMax, Math.min(ADAPT.totalMax, current + Math.max(-ADAPT.stepMax, Math.min(ADAPT.stepMax, diff))));
  const step = Math.round(nextTotal - current);
  if (step === 0) return null;
  return {
    ...profile,
    targetAdjustment: current + step,
    target: resolveDailyTarget({ ...profile, targetAdjustment: current + step }, todayKey).target,
    targetAdjustedAt: todayKey,
    lastAdjustment: step,
  };
}

// 存著的目標熱量跟公式算出來的不一樣（公式更新了、舊資料還沒重算、時間經過讓 Goal plan 需要重看）
// 就回傳重算後的 profile，一樣就回傳 null。
// 舊版存的是 goalMonths（幾個月），換成目標日期 goalDate：從今天起算那麼多個月
export function refreshedProfile(profile, today = todayKey()) {
  if (profile?.height == null || profile.weight == null || profile.age == null) return null;
  let p = profile;
  if (p.goalMonths > 0 && !p.goalDate) {
    const { goalMonths: _m, ...rest } = p;
    p = { ...rest, goalDate: addDays(today, Math.round(p.goalMonths * 30.44)) };
  }
  const next = recalcProfile(p, today);
  return p !== profile || next.goal !== profile.goal || Math.abs(next.target - (profile.target ?? 0)) > 1 ? next : null;
}

// ── 生日 → 年齡 ──────────────────────────────────────────────────────
export function ageFromBirthday(birthday, todayKey) {
  const [y0, m0, d0] = birthday.split('-').map(Number);
  const [y1, m1, d1] = todayKey.split('-').map(Number);
  let age = y1 - y0;
  if (m1 < m0 || (m1 === m0 && d1 < d0)) age--;
  return age;
}

// 年齡會隨時間增加：有生日就直接用生日算；沒有生日的舊資料用「填寫年齡的那一天」(ageSetAt) 起算，
// 每滿一年 +1 歲。年齡變了就重算 BMR / TDEE / 目標熱量。回傳更新後的 profile；不用更新就回傳 null
export function agedProfile(profile, todayKey) {
  if (profile?.age == null || profile.height == null) return null;
  if (profile.birthday) {
    const age = ageFromBirthday(profile.birthday, todayKey);
    return age === profile.age ? null : recalcProfile({ ...profile, age, ageSetAt: todayKey });
  }
  if (!profile.ageSetAt) return { ...profile, ageSetAt: todayKey }; // 舊資料沒有起算日，從今天開始算

  const [y0, m0, d0] = profile.ageSetAt.split('-').map(Number);
  const [y1, m1, d1] = todayKey.split('-').map(Number);
  let years = y1 - y0;
  if (m1 < m0 || (m1 === m0 && d1 < d0)) years--;
  if (years < 1) return null;

  const pad = n => String(n).padStart(2, '0');
  return recalcProfile({ ...profile, age: profile.age + years, ageSetAt: `${y0 + years}-${pad(m0)}-${pad(d0)}` });
}

// 前一天吃超過目標：建議接下來幾天每天少吃一點，把多的慢慢補回來，而不是隔天餓肚子。
// 每天最多少 400 kcal，而且調整後不低於 1200 kcal；最多分 7 天。
// （不用 BMR 當下限：久坐的人選減脂時，目標本來就常常低於 BMR，用 BMR 會變成幾乎永遠「不建議少吃」）
// 多吃不到 100 kcal 不值得調整，回傳 null；目標已經貼近下限、沒空間少吃時 perDay 是 0（改建議多活動）
const CATCH_UP_FLOOR = 1200;
export function catchUpPlan(surplus, target) {
  if (!(surplus >= 100) || target == null) return null;
  const room = Math.min(400, target - CATCH_UP_FLOOR);
  if (room < 50) return { surplus: Math.round(surplus), days: 0, perDay: 0, adjusted: Math.round(target) };
  const days = Math.min(7, Math.ceil(surplus / room));
  const perDay = Math.min(room, Math.round(surplus / days / 10) * 10);
  return { surplus: Math.round(surplus), days, perDay, adjusted: Math.round(target - perDay) };
}
