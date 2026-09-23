// free-exercise-db 資料集是英文原文，分類/部位/器材這類「有限列舉值」可以直接手動對照翻譯；
// 動作名稱（873 筆）跟步驟說明（3700+ 段、共約 57 萬字）量太大，不適合手動維護在這裡，
// 目前先維持英文，語言切到中文時這兩塊會 fallback 顯示英文原文。
const TAXONOMY_ZH = {
  level: {
    Beginner: '初學', Intermediate: '中階', Expert: '高階',
  },
  force: {
    Pull: '拉', Push: '推', Static: '靜態',
  },
  mechanic: {
    Compound: '複合', Isolation: '孤立',
  },
  category: {
    Strength: '肌力訓練', Stretching: '伸展', Plyometrics: '增強式訓練',
    Strongman: '大力士訓練', Powerlifting: '健力', Cardio: '有氧',
    'Olympic Weightlifting': '奧林匹克舉重',
  },
  equipment: {
    'Body Only': '徒手', Machine: '機械', Other: '其他', 'Foam Roll': '滾筒',
    Kettlebells: '壺鈴', Dumbbell: '啞鈴', Cable: '繩索機', Barbell: '槓鈴',
    Bands: '彈力帶', 'Medicine Ball': '藥球', 'Exercise Ball': '健身球', 'E-Z Curl Bar': '曲槓',
  },
  muscle: {
    Abdominals: '腹肌', Hamstrings: '大腿後側', Calves: '小腿', Shoulders: '肩膀',
    Adductors: '內收肌', Glutes: '臀肌', Quadriceps: '股四頭肌', Biceps: '二頭肌',
    Forearms: '前臂', Abductors: '外展肌', Triceps: '三頭肌', Chest: '胸肌',
    'Lower Back': '下背', Traps: '斜方肌', 'Middle Back': '中背', Lats: '背闊肌', Neck: '頸部',
  },
};

// 原始資料某些欄位是空的，exerciseLibrary.js 的 titleCase() 會補成 'Unspecified'
const UNSPECIFIED_ZH = '未知';

// dimension: 'level' | 'force' | 'mechanic' | 'category' | 'equipment' | 'muscle'
export function translateTaxonomy(dimension, value, lang) {
  if (lang !== 'zh' || !value) return value;
  if (value === 'Unspecified') return UNSPECIFIED_ZH;
  return TAXONOMY_ZH[dimension]?.[value] ?? value;
}

export function translateMuscleList(values, lang) {
  if (lang !== 'zh' || !values?.length) return values;
  return values.map(v => (v === 'Unspecified' ? UNSPECIFIED_ZH : TAXONOMY_ZH.muscle[v] ?? v));
}
