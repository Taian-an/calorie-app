import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, ScrollView, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from './_LanguageContext';

const C = {
  primary:       '#22C55E',
  primaryDark:   '#16A34A',
  bg:            '#F0FDF4',
  card:          '#FFFFFF',
  textPrimary:   '#14532D',
  textSecondary: '#6B7280',
  border:        '#E5E7EB',
  protein:       '#3B82F6',
  carbs:         '#F97316',
  fat:           '#EF4444',
};

// ── Demo user data ────────────────────────────────────────────────
const USER = { name: 'Chen Taian', age: 21, gender: 'male', height: 166, weight: 76, activity: 'moderately' };
const BMI   = USER.weight / Math.pow(USER.height / 100, 2);
const BMR   = Math.round(88.362 + 13.397 * USER.weight + 4.799 * USER.height - 5.677 * USER.age);
const TDEE  = Math.round(BMR * 1.55);
const PROTEIN_G = Math.round((TDEE * 0.20) / 4);
const CARBS_G   = Math.round((TDEE * 0.50) / 4);
const FAT_G     = Math.round((TDEE * 0.30) / 9);

function bmiInfo(val, t) {
  if (val < 18.5) return { label: t.bmiUnder  ?? 'Underweight', color: '#3B82F6', bg: '#EFF6FF' };
  if (val < 24)   return { label: t.bmiNormal ?? 'Normal',      color: '#22C55E', bg: '#F0FDF4' };
  if (val < 28)   return { label: t.bmiOver   ?? 'Overweight',  color: '#F97316', bg: '#FFF7ED' };
  return             { label: t.bmiObese  ?? 'Obese',       color: '#EF4444', bg: '#FEF2F2' };
}

// ── Sub-components ────────────────────────────────────────────────
function StatCard({ icon, value, unit, label, color, bg }) {
  return (
    <View style={[s.statCard, { backgroundColor: bg ?? C.card }]}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      {unit ? <Text style={s.statUnit}>{unit}</Text> : null}
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, valueColor }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoLeft}>
        <Text style={s.infoIcon}>{icon}</Text>
        <Text style={s.infoLabel}>{label}</Text>
      </View>
      <Text style={[s.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function MacroBar({ label, g, percent, color }) {
  return (
    <View style={s.macroBarWrap}>
      <View style={s.macroBarTop}>
        <Text style={s.macroBarLabel}>{label}</Text>
        <Text style={[s.macroBarG, { color }]}>{g}g</Text>
      </View>
      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function SettingRow({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={s.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={s.settingLeft}>
        <View style={s.settingIconBox}>
          <Ionicons name={icon} size={18} color={C.primaryDark} />
        </View>
        <Text style={s.settingLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.textSecondary} />
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────
export default function ProfileScreen() {
  const { t } = useLanguage();
  const bmi = bmiInfo(BMI, t);

  const SETTINGS = [
    { icon: 'scale-outline',       label: t.setUnits        ?? '單位設定' },
    { icon: 'notifications-outline', label: t.setNotify     ?? '提醒通知' },
    { icon: 'shield-checkmark-outline', label: t.setPrivacy ?? '隱私政策' },
    { icon: 'information-circle-outline', label: t.setAbout ?? '關於 AI 卡路里' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero Header ── */}
        <View style={s.hero}>
          <View style={s.avatarWrap}>
            <Image
              source={require('../avatars/avatar.png')}
              style={s.avatar}
            />
            <TouchableOpacity style={s.editAvatarBtn}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={s.heroName}>{USER.name}</Text>
          <Text style={s.heroBio}>
            {USER.age}{t.ageUnit}・{t.male?.replace('👨 ', '') ?? '男'}・{USER.height} cm・{USER.weight} kg
          </Text>
          <TouchableOpacity style={s.editBtn} activeOpacity={0.8}>
            <Ionicons name="pencil-outline" size={14} color="#FFF" />
            <Text style={s.editBtnText}>{t.editProfile ?? '編輯個人資料'}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.body}>

          {/* ── Quick Stats ── */}
          <View style={s.statsRow}>
            <StatCard
              icon="⚖️"
              value={BMI.toFixed(1)}
              label={`BMI・${bmi.label}`}
              color={bmi.color}
              bg={bmi.bg}
            />
            <StatCard
              icon="🔥"
              value={TDEE.toLocaleString()}
              unit="kcal"
              label={t.kcalUnit?.replace(' / ', '/') ?? 'kcal/天'}
              color={C.primaryDark}
              bg="#F0FDF4"
            />
            <StatCard
              icon="💪"
              value={BMR.toLocaleString()}
              unit="kcal"
              label={t.bmrLabel ?? 'BMR'}
              color="#8B5CF6"
              bg="#F5F3FF"
            />
          </View>

          {/* ── Daily Calorie Card ── */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>🎯 {t.dailyGoal ?? '每日熱量目標'}</Text>
              <Text style={s.cardTDEE}>{TDEE.toLocaleString()} kcal</Text>
            </View>
            <View style={s.macroSection}>
              <MacroBar label={t.proteinShort ?? '蛋白質'} g={PROTEIN_G} percent={20} color={C.protein} />
              <MacroBar label={t.carbsShort ?? '碳水'}    g={CARBS_G}   percent={50} color={C.carbs}   />
              <MacroBar label={t.fatShort ?? '脂肪'}      g={FAT_G}     percent={30} color={C.fat}     />
            </View>
          </View>

          {/* ── Body Data ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>📊 {t.bodyData ?? '身體數據'}</Text>
            <View style={s.divider} />
            <InfoRow icon="📏" label={t.height ?? '身高'}   value={`${USER.height} cm`} />
            <InfoRow icon="⚖️" label={t.weight ?? '體重'}   value={`${USER.weight} kg`} />
            <InfoRow icon="🧮" label="BMI"                   value={`${BMI.toFixed(1)}  ${bmi.label}`} valueColor={bmi.color} />
            <InfoRow icon="⚡" label={t.bmrLabel ?? 'BMR'}  value={`${BMR.toLocaleString()} kcal`} />
            <InfoRow icon="🏃" label={t.activityLevel ?? '活動程度'} value={t.activities?.find(a => a.key === USER.activity)?.label ?? '中度'} />
          </View>

          {/* ── Settings ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>⚙️ {t.settings ?? '設定'}</Text>
            <View style={s.divider} />
            {SETTINGS.map((item, i) => (
              <View key={item.label}>
                <SettingRow icon={item.icon} label={item.label} />
                {i < SETTINGS.length - 1 && <View style={s.settingDivider} />}
              </View>
            ))}
          </View>

          {/* ── App version ── */}
          <Text style={s.version}>AI Calorie Tracker v1.0.0</Text>
          <Text style={s.versionSub}>Powered by Hugging Face × USDA FoodData</Text>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  /* Hero */
  hero: {
    backgroundColor: C.primaryDark,
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatarWrap:     { position: 'relative', marginBottom: 14 },
  avatar:         { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: '#FFF' },
  editAvatarBtn:  {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  heroName:  { fontSize: 22, fontWeight: '900', color: '#FFF', letterSpacing: -0.3 },
  heroBio:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 5, fontWeight: '500' },
  editBtn:   {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
  },
  editBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  body: { paddingHorizontal: 18, paddingTop: 20 },

  /* Quick Stats */
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, borderRadius: 16, padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statIcon:  { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statUnit:  { fontSize: 10, color: C.textSecondary, fontWeight: '600' },
  statLabel: { fontSize: 10, color: C.textSecondary, marginTop: 3, textAlign: 'center', fontWeight: '600' },

  /* Cards */
  card: {
    backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle:  { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  cardTDEE:   { fontSize: 20, fontWeight: '900', color: C.primaryDark },
  divider:    { height: 1, backgroundColor: C.border, marginVertical: 12 },

  /* Macro Bars */
  macroSection:  { gap: 10 },
  macroBarWrap:  {},
  macroBarTop:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  macroBarLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  macroBarG:     { fontSize: 12, fontWeight: '800' },
  barBg:         { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4 },
  barFill:       { height: 8, borderRadius: 4 },

  /* Info Rows */
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  infoLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIcon:  { fontSize: 18, width: 28, textAlign: 'center' },
  infoLabel: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },
  infoValue: { fontSize: 14, fontWeight: '800', color: C.textPrimary },

  /* Settings */
  settingRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13 },
  settingLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },
  settingLabel:   { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  settingDivider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 46 },

  /* Footer */
  version:    { textAlign: 'center', fontSize: 12, color: C.textSecondary, fontWeight: '600', marginTop: 4 },
  versionSub: { textAlign: 'center', fontSize: 10, color: '#9CA3AF', marginTop: 4 },
});
