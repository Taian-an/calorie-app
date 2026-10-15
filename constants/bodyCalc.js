// 身體數據的計算：onboarding、個人資料編輯、每年自動更新年齡都走這裡，確保同一套公式

// 'other' = 其他 / 不願透露。公式本身只分男女，選 other 時取兩條公式的平均，誤差會比選男/女大一點
export const GENDER_KEYS = ['male', 'female', 'other'];

const ACTIVITY_FACTORS = { sedentary: 1.2, lightly: 1.375, moderately: 1.55, very: 1.725, extra: 1.9 };

// 目標模式對 TDEE 的增減
export const GOAL_DELTAS = { bulk: 300, cut: -400, maintain: 0 };
// 目標熱量的安全下限：再怎麼減脂、再怎麼動態調整，都不建議每天低於這個數字
export const MIN_TARGET = 1200;

// Harris-Benedict 公式
export function calcBmr(gender, weight, height, age) {
  const male   = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  const female = 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age;
  if (gender === 'male') return male;
  if (gender === 'female') return female;
  return (male + female) / 2;
}

export function activityFactor(activity) {
  return ACTIVITY_FACTORS[activity] ?? 1.2;
}

// ── Goal-based Nutrition Engine ─────────────────────────────────────
// Goal 由目標體重決定：比目前重 → 增肌、比目前輕 → 減脂、差不到 0.3 kg → 維持
export function goalFromWeights(weight, targetWeight) {
  if (weight == null || targetWeight == null) return null;
  return targetWeight > weight + 0.3 ? 'bulk' : targetWeight < weight - 0.3 ? 'cut' : 'maintain';
}

// Target = TDEE + Goal 增減 + Adaptive adjustment（見 GLOSSARY），不低於 MIN_TARGET
export function targetCalories(tdee, goal, adjustment = 0) {
  return Math.max(MIN_TARGET, tdee + (GOAL_DELTAS[goal] ?? 0) + (adjustment || 0));
}

// 身體資料改了（性別、生日、身高、體重、目標體重、活動量）就用這支重算整份 profile：
// BMR → TDEE → Goal（有目標體重才重判）→ Target。動態調整的累計值保留，不因為改資料歸零
export function recalcProfile(p) {
  const bmr = calcBmr(p.gender, p.weight, p.height, p.age);
  const tdee = bmr * activityFactor(p.activity);
  const goal = goalFromWeights(p.weight, p.targetWeight) ?? (GOAL_DELTAS[p.goal] != null ? p.goal : 'maintain');
  return { ...p, bmr, tdee, goal, target: targetCalories(tdee, goal, p.targetAdjustment) };
}

// 三大營養素目標依 Goal 調整：蛋白質依體重（減脂 2.0 g/kg 保肌肉、增肌 1.8、維持 1.6），
// 脂肪佔熱量的固定比例，剩下的給碳水。蛋白質最多佔 35% 熱量，避免體重很重時比例失衡
const MACRO_RULES = {
  cut:      { proteinPerKg: 2.0, fatShare: 0.25 },
  bulk:     { proteinPerKg: 1.8, fatShare: 0.25 },
  maintain: { proteinPerKg: 1.6, fatShare: 0.30 },
};
export function macroTargets(target, weightKg, goal) {
  if (target == null) return null;
  const rule = MACRO_RULES[goal] ?? MACRO_RULES.maintain;
  const protein = weightKg ? Math.min(rule.proteinPerKg * weightKg, (target * 0.35) / 4) : (target * 0.20) / 4;
  const fat = (target * rule.fatShare) / 9;
  const carbs = Math.max(0, (target - protein * 4 - fat * 9) / 4);
  return { protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) };
}
export const MACRO_RULE_FOR = (goal) => MACRO_RULES[goal] ?? MACRO_RULES.maintain;

// ── 日期小工具（Day 是 YYYY-MM-DD）──────────────────────────────────
const dayNum = (key) => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
export const daysBetween = (fromKey, toKey) => dayNum(toKey) - dayNum(fromKey);
const addDays = (key, n) => new Date((dayNum(key) + n) * 86400000).toISOString().slice(0, 10);

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
const KCAL_PER_KG = 7700;

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
  const ideal = estimatedTdee + (GOAL_DELTAS[profile.goal] ?? 0);
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
    target: targetCalories(profile.tdee, profile.goal, current + step),
    targetAdjustedAt: todayKey,
    lastAdjustment: step,
  };
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
export function catchUpPlan(surplus, target) {
  if (!(surplus >= 100) || target == null) return null;
  const room = Math.min(400, target - MIN_TARGET);
  if (room < 50) return { surplus: Math.round(surplus), days: 0, perDay: 0, adjusted: Math.round(target) };
  const days = Math.min(7, Math.ceil(surplus / room));
  const perDay = Math.min(room, Math.round(surplus / days / 10) * 10);
  return { surplus: Math.round(surplus), days, perDay, adjusted: Math.round(target - perDay) };
}
