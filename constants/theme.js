// App 的配色：淺色 / 深色兩套，key 完全一樣。畫面不要再寫死色碼，一律從 useTheme() 拿 C。
export const THEME_KEYS = ['light', 'dark', 'system'];

const shared = {
  primary:      '#22C55E',
  primaryDark:  '#16A34A',
  onPrimary:    '#FFFFFF',
  warn:         '#F97316',
  danger:       '#DC2626',
  required:     '#EF4444',
  info:         '#3B82F6',
  purple:       '#8B5CF6',
  macroProtein: '#3B82F6',
  macroCarbs:   '#F97316',
  macroFat:     '#EF4444',
  deficit:      '#16A34A',
  surplus:      '#DC2626',
  shadow:       '#000000',
};

export const PALETTES = {
  light: {
    ...shared,
    bg:            '#F0FDF4',
    card:          '#FFFFFF',
    textPrimary:   '#14532D',
    textSecondary: '#6B7280',
    textMuted:     '#9CA3AF',
    border:        '#E5E7EB',
    borderStrong:  '#D1D5DB',
    subtle:        '#F9FAFB', // 卡片裡的淺灰底（選項、chip）
    muted:         '#F3F4F6', // 分隔線、次要按鈕底
    tint:          '#F0FDF4', // 淡綠底（選中、icon 方框）
    tintStrong:    '#DCFCE7', // 進度條軌道等較深的淡綠
    infoSoft:      '#EFF6FF',
    warnSoft:      '#FFF7ED',
    dangerSoft:    '#FEF2F2',
    purpleSoft:    '#F5F3FF',
    overlay:       'rgba(0,0,0,0.45)',
    switchOff:     '#E5E7EB',
    hero:          '#16A34A', // 個人頁頂部的大色塊，上面是白字
  },
  dark: {
    ...shared,
    primaryDark:   '#4ADE80',
    bg:            '#0B110D',
    card:          '#161D19',
    textPrimary:   '#E7F5EC',
    textSecondary: '#9CA3AF',
    textMuted:     '#6B7280',
    border:        '#26302A',
    borderStrong:  '#36423A',
    subtle:        '#1C2420',
    muted:         '#222B26',
    tint:          '#13281B',
    tintStrong:    '#1C3A27',
    infoSoft:      '#14213A',
    warnSoft:      '#2E1F10',
    dangerSoft:    '#321617',
    purpleSoft:    '#231C3A',
    overlay:       'rgba(0,0,0,0.65)',
    switchOff:     '#36423A',
    hero:          '#14532D',
  },
};
