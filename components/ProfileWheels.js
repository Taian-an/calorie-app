import { useState } from 'react';
import { WheelSheet, numberItems } from './WheelPicker';
import { ageFromBirthday } from '../constants/bodyCalc';
import { dateKey } from '../context/UserDataContext';
import { weightToDisplay, weightFromDisplay, weightUnitLabel, roundCm, roundKg } from '../constants/units';

// 個人頁的滾輪選單：生日、身高、體重、目標體重、目標日期。
// 身高體重依「設定 → 單位」顯示公制或英制，存檔一律換回 cm / kg

const pad = n => String(n).padStart(2, '0');
const indexOf = (items, value) => Math.max(0, items.findIndex(it => it.value === value));

// 日期：日 / 月 / 年三欄。years 是年份清單（生日由近到遠、目標日期由近到遠往後）。
// 換月份或年份時日數不夠就夾到月底。onSave 拿到 YYYY-MM-DD；validate 回傳 false 時不存
export function DateSheet({ title, t, lang, initial, years: yearList, validate, onSave, onClose }) {
  const [y0, m0, d0] = initial.split('-').map(Number);
  const [year, setYear] = useState(y0);
  const [month, setMonth] = useState(m0);
  const [day, setDay] = useState(d0);
  const locale = lang === 'zh' ? 'zh-TW' : 'en-US';

  const daysInMonth = new Date(year, month, 0).getDate();
  const dayValue = Math.min(day, daysInMonth);
  const days = numberItems(1, daysInMonth);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1, label: new Date(2000, i, 1).toLocaleDateString(locale, { month: 'long' }),
  }));
  const years = yearList.map(y => ({ value: y, label: String(y) }));

  const save = () => {
    const key = `${year}-${pad(month)}-${pad(dayValue)}`;
    if (!validate || validate(key)) onSave(key);
  };

  return (
    <WheelSheet
      title={title}
      saveLabel={t.saveLabel}
      onClose={onClose}
      onSave={save}
      columns={[
        { items: days, index: dayValue - 1, onChange: i => setDay(days[i].value), flex: 0.7 },
        { items: months, index: month - 1, onChange: i => setMonth(months[i].value), flex: 1.6 },
        { items: years, index: indexOf(years, year), onChange: i => setYear(years[i].value), flex: 1 },
      ]}
    />
  );
}

// 生日：年份由近到遠（13–100 歲）
export function BirthdaySheet({ t, lang, initial, fallbackAge, onSave, onClose }) {
  const thisYear = new Date().getFullYear();
  const years = [];
  for (let y = thisYear - 13; y >= thisYear - 100; y--) years.push(y);
  return (
    <DateSheet
      title={t.birthday} t={t} lang={lang}
      initial={initial ?? `${thisYear - (fallbackAge || 25)}-01-01`}
      years={years}
      validate={key => { const age = ageFromBirthday(key, dateKey()); return age >= 13 && age <= 100; }}
      onSave={onSave} onClose={onClose}
    />
  );
}

// Goal plan 的目標日期：今年起往後 4 年。是否在合理範圍由 validateGoal 判斷並顯示原因，這裡不擋
export function TargetDateSheet({ t, lang, initial, onSave, onClose }) {
  const thisYear = new Date().getFullYear();
  return (
    <DateSheet
      title={t.goalTargetDate} t={t} lang={lang}
      initial={initial}
      years={[0, 1, 2, 3, 4].map(n => thisYear + n)}
      onSave={onSave} onClose={onClose}
    />
  );
}

// 身高：公制一欄 cm；英制兩欄 ft / in
export function HeightSheet({ t, units, initialCm, onSave, onClose }) {
  const imperial = units === 'imperial';
  const totalIn = Math.round(initialCm / 2.54);
  const [cm, setCm] = useState(Math.min(230, Math.max(100, Math.round(initialCm))));
  const [ft, setFt] = useState(Math.min(7, Math.max(3, Math.floor(totalIn / 12))));
  const [inch, setInch] = useState(totalIn % 12);

  const cmItems = numberItems(100, 230);
  const ftItems = numberItems(3, 7, 1, v => `${v} ft`);
  const inItems = numberItems(0, 11, 1, v => `${v} in`);

  const save = () => {
    // 沒動過就沿用原本的值，避免 cm ↔ in 來回換算讓身高每存一次就偏一點
    if (imperial ? ft * 12 + inch === totalIn : cm === Math.round(initialCm)) { onClose(); return; }
    onSave(roundCm(imperial ? (ft * 12 + inch) * 2.54 : cm));
  };

  return (
    <WheelSheet
      title={t.height}
      saveLabel={t.saveLabel}
      onClose={onClose}
      onSave={save}
      suffix={imperial ? undefined : 'cm'}
      columns={imperial
        ? [
          { items: ftItems, index: indexOf(ftItems, ft), onChange: i => setFt(ftItems[i].value) },
          { items: inItems, index: indexOf(inItems, inch), onChange: i => setInch(inItems[i].value) },
        ]
        : [{ items: cmItems, index: indexOf(cmItems, cm), onChange: i => setCm(cmItems[i].value) }]}
    />
  );
}

// 體重 / 目標體重：整數一欄 + 小數一欄（.0–.9），單位 kg 或 lb
export function WeightSheet({ title, t, units, initialKg, onSave, onClose }) {
  const shown = weightToDisplay(initialKg, units);
  const min = units === 'imperial' ? 66 : 30;
  const max = units === 'imperial' ? 551 : 250;
  const [whole, setWhole] = useState(Math.min(max, Math.max(min, Math.floor(shown))));
  const [tenth, setTenth] = useState(Math.round((shown - Math.floor(shown)) * 10) % 10);

  const wholeItems = numberItems(min, max);
  const tenthItems = numberItems(0, 9, 1, v => `.${v}`);

  const save = () => {
    const value = whole + tenth / 10;
    if (Math.abs(value - shown) < 0.05) { onSave(initialKg); return; }
    onSave(roundKg(weightFromDisplay(value, units)));
  };

  return (
    <WheelSheet
      title={title}
      saveLabel={t.saveLabel}
      onClose={onClose}
      onSave={save}
      suffix={weightUnitLabel(units)}
      columns={[
        { items: wholeItems, index: indexOf(wholeItems, whole), onChange: i => setWhole(wholeItems[i].value), flex: 1.4, align: 'right' },
        { items: tenthItems, index: tenth, onChange: i => setTenth(tenthItems[i].value), flex: 0.8, align: 'left' },
      ]}
    />
  );
}
