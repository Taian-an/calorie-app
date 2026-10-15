import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useStyles, useTheme } from '../context/PreferencesContext';

// 「新增食物」選單（拍照 / 上傳 / 文字 / 條碼）。餐次的 + 號和底部導覽列中間的相機鈕共用同一個。
// open('lunch') 會先指定餐次；open() 不指定，進到辨識頁後依時段預設，分析完再選要記到哪一餐
const AddFoodContext = createContext(null);

export function AddFoodProvider({ children }) {
  const [target, setTarget] = useState(null); // null = 關閉；'' = 未指定餐次；其他 = 餐次
  const open = useCallback((mealType = '') => setTarget(mealType), []);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <AddFoodContext.Provider value={value}>
      {children}
      {target != null && <AddFoodSheet target={target} onClose={() => setTarget(null)} />}
    </AddFoodContext.Provider>
  );
}

export function useAddFood() {
  const ctx = useContext(AddFoodContext);
  if (!ctx) throw new Error('useAddFood must be used within AddFoodProvider');
  return ctx;
}

function AddFoodSheet({ target, onClose }) {
  const { t } = useLanguage();
  const { C } = useTheme();
  const s = useStyles(makeStyles);

  const go = (pathname, extra = {}) => {
    onClose();
    router.push({ pathname, params: { mealType: target, ...extra } });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={s.card}>
          <Text style={s.title}>
            {target ? `${t[target]}・` : ''}{t.addFoodTitle}
          </Text>

          <TouchableOpacity style={s.scanBtn} activeOpacity={0.85} onPress={() => go('/camera')}>
            <Ionicons name="camera" size={20} color={C.onPrimary} />
            <Text style={s.scanBtnText}>{t.scanFoodOption}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.optionBtn} activeOpacity={0.85} onPress={() => go('/camera', { autoPick: '1' })}>
            <Ionicons name="cloud-upload-outline" size={20} color={C.primaryDark} />
            <Text style={s.optionBtnText}>{t.uploadImage}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.optionBtn} activeOpacity={0.85} onPress={() => go('/camera', { manual: '1' })}>
            <Ionicons name="create-outline" size={20} color={C.primaryDark} />
            <Text style={s.optionBtnText}>{t.manualTextOption}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.optionBtn} activeOpacity={0.85} onPress={() => go('/barcode')}>
            <Ionicons name="barcode-outline" size={20} color={C.primaryDark} />
            <Text style={s.optionBtnText}>{t.barcodeScanOption}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const makeStyles = (C) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  card: {
    width: '100%', maxHeight: '80%', backgroundColor: C.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20,
  },
  title: { fontSize: 17, fontWeight: '800', color: C.textPrimary, marginBottom: 16, textAlign: 'center' },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primaryDark, borderRadius: 16, paddingVertical: 15, marginBottom: 18,
  },
  scanBtnText: { color: C.onPrimary, fontSize: 15, fontWeight: '800' },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.tint, borderRadius: 16, borderWidth: 1.5, borderColor: C.primary,
    paddingVertical: 14, marginTop: 10,
  },
  optionBtnText: { color: C.primaryDark, fontSize: 15, fontWeight: '800' },
});
