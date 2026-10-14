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
