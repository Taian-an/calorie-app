// 單位換算：profile 和日誌永遠用公制存（cm、kg），所有公式也只吃公制。
// 使用者選英制時只在「顯示」和「輸入」這一層換算，存檔前一律換回公制。
export const UNIT_KEYS = ['metric', 'imperial'];

const LB_PER_KG = 2.20462262;
const CM_PER_IN = 2.54;

const round1 = (n) => Math.round(n * 10) / 10;

// 體重：公制顯示 kg、英制顯示 lb，都到小數一位
export function weightToDisplay(kg, units) {
  return round1(units === 'imperial' ? kg * LB_PER_KG : kg);
}
export function weightFromDisplay(value, units) {
  return units === 'imperial' ? value / LB_PER_KG : value;
}
export const weightUnitLabel = (units) => (units === 'imperial' ? 'lb' : 'kg');
export const formatWeight = (kg, units) => `${weightToDisplay(kg, units)} ${weightUnitLabel(units)}`;
// 體重差（可能是負數）帶單位，例如 "+1.5 kg"
export const formatWeightDelta = (kg, units) => {
  const v = weightToDisplay(kg, units);
  return `${v > 0 ? '+' : ''}${v} ${weightUnitLabel(units)}`;
};

// 身高：公制顯示 cm；英制內部以「總英吋」當輸入值，顯示成 5′7″
export function heightToDisplay(cm, units) {
  return units === 'imperial' ? Math.round(cm / CM_PER_IN) : round1(cm);
}
export function heightFromDisplay(value, units) {
  return units === 'imperial' ? value * CM_PER_IN : value;
}
export function formatInches(totalIn) {
  const ft = Math.floor(totalIn / 12);
  return `${ft}′${Math.round(totalIn - ft * 12)}″`;
}
export const formatHeight = (cm, units) =>
  (units === 'imperial' ? formatInches(heightToDisplay(cm, units)) : `${round1(cm)} cm`);

// 英制身高的文字輸入：接受 5'7、5′7″、5 7 這種「呎 吋」寫法；只打一個數字時，小於 9 當呎、其他當總英吋
export function parseInches(text) {
  const nums = String(text).match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length >= 2) return nums[0] * 12 + nums[1];
  if (nums.length === 1) return nums[0] < 9 ? nums[0] * 12 : nums[0];
  return NaN;
}

// 存檔用：公制取到合理精度，英制換回來的小數不會一路累積
export const roundCm = (cm) => round1(cm);
export const roundKg = (kg) => Math.round(kg * 100) / 100;
