import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MEAL_TYPES } from '../context/UserDataContext';

// 辨識結果上的餐次切換：拍完才發現餐次選錯（例如早餐該是午餐），存檔前點一下就改，不用刪掉重拍。
// dark 給相機頁的黑底結果卡用
export default function MealPicker({ value, onChange, t, dark = false }) {
  return (
    <View style={s.row}>
      {MEAL_TYPES.map(type => {
        const sel = type === value;
        return (
          <TouchableOpacity
            key={type}
            style={[s.chip, dark && s.chipDark, sel && s.chipSel]}
            onPress={() => onChange(type)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: sel }}
          >
            <Text style={[s.chipText, dark && s.chipTextDark, sel && s.chipTextSel]}>{t[type]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, marginBottom: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  chipDark: { borderColor: '#444', backgroundColor: '#222' },
  chipSel: { borderColor: '#22C55E', backgroundColor: '#22C55E' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  chipTextDark: { color: '#bbb' },
  chipTextSel: { color: '#FFFFFF' },
});
