// 身體數據的計算：onboarding、個人資料編輯、每年自動更新年齡都走這裡，確保同一套公式

// 'other' = 其他 / 不願透露。公式本身只分男女，選 other 時取兩條公式的平均，誤差會比選男/女大一點
export const GENDER_KEYS = ['male', 'female', 'other'];

const ACTIVITY_FACTORS = { sedentary: 1.2, lightly: 1.375, moderately: 1.55, very: 1.725, extra: 1.9 };

// 目標模式對 TDEE 的增減（與首頁 GOAL_META 一致）
export const GOAL_DELTAS = { bulk: 300, cut: -400, maintain: 0 };

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

// 年齡會隨時間增加：profile 存「填寫年齡的那一天」(ageSetAt, YYYY-MM-DD)，
// 每滿一年就 +1 歲並重算 BMR / TDEE / 目標熱量。回傳更新後的 profile；不用更新就回傳 null
export function agedProfile(profile, todayKey) {
  if (profile?.age == null || profile.height == null) return null;
  if (!profile.ageSetAt) return { ...profile, ageSetAt: todayKey }; // 舊資料沒有起算日，從今天開始算

  const [y0, m0, d0] = profile.ageSetAt.split('-').map(Number);
  const [y1, m1, d1] = todayKey.split('-').map(Number);
  let years = y1 - y0;
  if (m1 < m0 || (m1 === m0 && d1 < d0)) years--;
  if (years < 1) return null;

  const age = profile.age + years;
  const bmr = calcBmr(profile.gender, profile.weight, profile.height, age);
  const tdee = bmr * activityFactor(profile.activity);
  // 目標熱量跟著 TDEE 平移，保留使用者原本相對 TDEE 的增減
  const target = profile.target != null && profile.tdee != null
    ? profile.target + (tdee - profile.tdee)
    : tdee + (GOAL_DELTAS[profile.goal] ?? 0);
  const pad = n => String(n).padStart(2, '0');
  return { ...profile, age, bmr, tdee, target, ageSetAt: `${y0 + years}-${pad(m0)}-${pad(d0)}` };
}

// 前一天吃超過目標：建議接下來幾天每天少吃一點，把多的慢慢補回來，而不是隔天餓肚子。
// 每天最多少 400 kcal，而且調整後不低於 1200 kcal；最多分 7 天。
// （不用 BMR 當下限：久坐的人選減脂時，目標本來就常常低於 BMR，用 BMR 會變成幾乎永遠「不建議少吃」）
// 多吃不到 100 kcal 不值得調整，回傳 null；目標已經貼近下限、沒空間少吃時 perDay 是 0（改建議多活動）
export function catchUpPlan(surplus, target) {
  if (!(surplus >= 100) || target == null) return null;
  const room = Math.min(400, target - 1200);
  if (room < 50) return { surplus: Math.round(surplus), days: 0, perDay: 0, adjusted: Math.round(target) };
  const days = Math.min(7, Math.ceil(surplus / room));
  const perDay = Math.min(room, Math.round(surplus / days / 10) * 10);
  return { surplus: Math.round(surplus), days, perDay, adjusted: Math.round(target - perDay) };
}
