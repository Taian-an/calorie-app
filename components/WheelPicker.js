import { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useStyles } from '../context/PreferencesContext';

// 滾輪選單（像 iOS 的日期選擇器）：每一欄上下滑動，停下來時自動對齊到最近的一格，中間那格就是選到的值。
// 手機用 snapToInterval 對齊；網頁沒有慣性停止事件，改成「捲動停下 150ms 後」自己對齊，兩邊行為一樣
const ITEM_HEIGHT = 48;
const VISIBLE_ROWS = 5;
const PAD_ROWS = Math.floor(VISIBLE_ROWS / 2);

export function WheelColumn({ items, selectedIndex, onChange, flex = 1, align = 'center' }) {
  const s = useStyles(makeStyles);
  const ref = useRef(null);
  const settleTimer = useRef(null);
  const [liveIndex, setLiveIndex] = useState(selectedIndex);
  const clamp = i => Math.max(0, Math.min(items.length - 1, i));

  // 第一次顯示時捲到目前的值
  useEffect(() => {
    const id = setTimeout(() => ref.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false }), 0);
    return () => clearTimeout(id);
  }, []);

  // 外部改了值（例如換月份後日數變少、日被夾回 30 號）時跟著捲過去
  useEffect(() => {
    if (selectedIndex !== liveIndex) {
      setLiveIndex(selectedIndex);
      ref.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: true });
    }
  }, [selectedIndex]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  const settle = (y) => {
    const i = clamp(Math.round(y / ITEM_HEIGHT));
    setLiveIndex(i);
    if (i !== selectedIndex) onChange(i);
    if (Math.abs(y - i * ITEM_HEIGHT) > 1) ref.current?.scrollTo({ y: i * ITEM_HEIGHT, animated: true });
  };

  const onScroll = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    setLiveIndex(clamp(Math.round(y / ITEM_HEIGHT)));
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => settle(y), 150);
  };

  return (
    <View style={{ flex, height: ITEM_HEIGHT * VISIBLE_ROWS }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * PAD_ROWS }}
        nestedScrollEnabled
      >
        {items.map((item, i) => {
          const dist = Math.abs(i - liveIndex);
          return (
            <TouchableOpacity
              key={String(item.value)}
              style={[s.item, { alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center' }]}
              onPress={() => { ref.current?.scrollTo({ y: i * ITEM_HEIGHT, animated: true }); settle(i * ITEM_HEIGHT); }}
              activeOpacity={0.6}
            >
              <Text
                style={[s.itemText, dist === 0 && s.itemTextSelected, { opacity: dist === 0 ? 1 : dist === 1 ? 0.55 : 0.28 }]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// 從底部滑出的滾輪選單：標題 + 一到多欄滾輪 + 儲存。columns 每一欄是
// { items: [{ value, label }], index, onChange(index), flex?, align? }；suffix 是滾輪右邊固定的單位文字
export function WheelSheet({ title, columns, suffix, saveLabel, onSave, onClose }) {
  const s = useStyles(makeStyles);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>{title}</Text>
          <View style={s.wheels}>
            <View pointerEvents="none" style={s.band} />
            {columns.map((col, i) => (
              <WheelColumn
                key={i}
                items={col.items}
                selectedIndex={col.index}
                onChange={col.onChange}
                flex={col.flex}
                align={col.align}
              />
            ))}
            {!!suffix && <Text style={s.suffix}>{suffix}</Text>}
          </View>
          <TouchableOpacity style={s.saveBtn} onPress={onSave} activeOpacity={0.85}>
            <Text style={s.saveText}>{saveLabel}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// 數字項目：numberItems(30, 250) → 30…250；step 可以是小數
export const numberItems = (from, to, step = 1, format = v => String(v)) => {
  const out = [];
  for (let v = from; v <= to + 1e-9; v += step) {
    const value = Math.round(v * 10) / 10;
    out.push({ value, label: format(value) });
  }
  return out;
};

const makeStyles = (C) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.borderStrong, marginBottom: 18 },
  title: { fontSize: 18, fontWeight: '800', color: C.textPrimary, marginBottom: 8 },
  wheels: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  band: {
    position: 'absolute', left: 0, right: 0, top: ITEM_HEIGHT * PAD_ROWS, height: ITEM_HEIGHT,
    borderRadius: 14, backgroundColor: C.tint, borderWidth: 1.5, borderColor: C.primary,
  },
  item: { height: ITEM_HEIGHT, justifyContent: 'center', paddingHorizontal: 12 },
  itemText: { fontSize: 20, fontWeight: '600', color: C.textPrimary },
  itemTextSelected: { fontSize: 24, fontWeight: '800' },
  suffix: { fontSize: 16, fontWeight: '700', color: C.textSecondary, paddingRight: 12 },
  saveBtn: { marginTop: 20, borderRadius: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: C.primary },
  saveText: { fontSize: 16, fontWeight: '800', color: C.onPrimary },
});
