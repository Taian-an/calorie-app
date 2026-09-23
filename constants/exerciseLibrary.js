import rawExercises from './exercises.json';

// 圖片不打包進 App（上游共 1,746 張 / ~98MB），直接連 free-exercise-db 的 GitHub raw
const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

// 對應 fud-ai ExerciseItem.metadataTitle：把 "lower back" -> "Lower Back"、"e-z curl bar" -> "E-z Curl Bar"
function titleCase(value) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return 'Unspecified';
  return trimmed
    .split(/\s+/)
    .map(word => word
      .split('-')
      .map(seg => (seg ? seg[0].toUpperCase() + seg.slice(1).toLowerCase() : ''))
      .join('-'))
    .join(' ');
}

const LEVEL_RANK = { beginner: 0, intermediate: 1, expert: 2, advanced: 2 };
const levelRank = (level) => LEVEL_RANK[(level ?? '').toLowerCase()] ?? 3;

// 正規化後的動作清單（模組載入時算一次）
export const EXERCISES = rawExercises
  .filter(r => r.id?.trim() && r.name?.trim())
  .map(r => {
    const primaryMuscles = (r.primaryMuscles ?? []).map(titleCase).filter(v => v !== 'Unspecified');
    const secondaryMuscles = (r.secondaryMuscles ?? []).map(titleCase).filter(v => v !== 'Unspecified');
    const instructions = (r.instructions ?? []).map(s => s.trim()).filter(Boolean);
    const item = {
      id: r.id.trim(),
      name: r.name.trim(),
      level: titleCase(r.level),
      force: titleCase(r.force),
      mechanic: titleCase(r.mechanic),
      category: titleCase(r.category),
      equipment: titleCase(r.equipment),
      primaryMuscles,
      secondaryMuscles,
      instructions,
      // 上游 repo 的圖片路徑是 exercises/<id>/<n>.jpg
      imageUrls: (r.images ?? []).map((_, i) => `${IMAGE_BASE}/${encodeURIComponent(r.id.trim())}/${i}.jpg`),
    };
    item.searchableText = [
      item.name, item.level, item.force, item.mechanic, item.category, item.equipment,
      primaryMuscles.join(' '), secondaryMuscles.join(' '), instructions.join(' '),
    ].join(' ').toLowerCase();
    return item;
  })
  .sort((a, b) => a.name.localeCompare(b.name));

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => {
    const ra = levelRank(a), rb = levelRank(b);
    return ra !== rb ? ra - rb : a.toLowerCase().localeCompare(b.toLowerCase());
  });
}

// 篩選器的選項清單
export const OPTIONS = {
  level: sortedUnique(EXERCISES.map(e => e.level)),
  equipment: sortedUnique(EXERCISES.map(e => e.equipment)),
  primaryMuscle: sortedUnique(EXERCISES.flatMap(e => e.primaryMuscles)),
  // 分類依動作數量多到少排（對應 availableCategoriesByCount）
  category: Object.entries(
    EXERCISES.reduce((acc, e) => ((acc[e.category] = (acc[e.category] ?? 0) + 1), acc), {})
  )
    .sort(([ka, va], [kb, vb]) => (vb - va) || ka.toLowerCase().localeCompare(kb.toLowerCase()))
    .map(([k]) => k),
};

// 篩選 + 搜尋 + 排序（單選制；值為 null 代表該維度不過濾）
export function filterExercises({ search = '', level = null, equipment = null, primaryMuscle = null, category = null, sort = 'name' } = {}) {
  const query = search.trim().toLowerCase();
  const items = EXERCISES.filter(e =>
    (!level || e.level === level) &&
    (!equipment || e.equipment === equipment) &&
    (!primaryMuscle || e.primaryMuscles.includes(primaryMuscle)) &&
    (!category || e.category === category) &&
    (!query || e.searchableText.includes(query))
  );
  if (sort === 'level') {
    return items.slice().sort((a, b) =>
      (levelRank(a.level) - levelRank(b.level)) || a.name.localeCompare(b.name));
  }
  return items; // EXERCISES 本身已依名稱排序
}
