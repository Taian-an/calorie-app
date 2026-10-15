// Entry 的營養素欄位與份量換算：詳細頁改份量、進度頁算平均都用這裡

export const MACRO_KEYS = ['protein', 'carbs', 'fat'];
// 微量營養素的單位（後端 Analysis model 的欄位註解也是這組）
export const MICRO_UNITS = {
  fiber: 'g', sugar: 'g', sodium: 'mg', potassium: 'mg',
  calcium: 'mg', iron: 'mg', vitaminC: 'mg', vitaminA: 'mcg',
};
const SCALED_KEYS = ['energy', ...MACRO_KEYS, ...Object.keys(MICRO_UNITS)];

const round1 = v => Math.round(v * 10) / 10;

// 份量變成原本的 factor 倍：熱量與所有營養素等比例調整，克數（或份數）也一起改
export function scaleEntry(entry, factor) {
  const next = {};
  for (const k of SCALED_KEYS) {
    if (typeof entry[k] === 'number') next[k] = k === 'energy' ? Math.round(entry[k] * factor) : round1(entry[k] * factor);
  }
  if (entry.grams > 0) next.grams = round1(entry.grams * factor);
  else next.servings = round1((entry.servings ?? 1) * factor);
  return next;
}

// Entry 的照片：AI 辨識存在後端的縮圖，或條碼商品的外部圖片；都沒有就是 null
const API_BASE = process.env.EXPO_PUBLIC_API_URL;
export function entryPhotoUri(entry) {
  if (entry?.photoId) return `${API_BASE}/photos/${entry.photoId}`;
  return entry?.photoUrl ?? null;
}

// 食物克數在英制下顯示成盎司
export const GRAMS_PER_OZ = 28.3495;
