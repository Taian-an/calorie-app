import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, SafeAreaView, Modal,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useLanguage } from './_LanguageContext';
import translations, { LANG_KEYS } from './_translations';

const C = {
  primary:       '#22C55E',
  primaryDark:   '#16A34A',
  bg:            '#F0FDF4',
  card:          '#FFFFFF',
  textPrimary:   '#14532D',
  textSecondary: '#6B7280',
  border:        '#E5E7EB',
};

export default function Index() {
  const { lang, setLang, t } = useLanguage();
  const [age,           setAge]           = useState('');
  const [gender,        setGender]        = useState('male');
  const [height,        setHeight]        = useState('');
  const [weight,        setWeight]        = useState('');
  const [activity,      setActivity]      = useState('sedentary');
  const [showLangModal, setShowLangModal] = useState(false);

  const handleCalculate = () => {
    if (!age || !height || !weight) return;
    const w = parseFloat(weight), h = parseFloat(height), a = parseFloat(age);
    const bmr = gender === 'male'
      ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a
      : 447.593 + 9.247 * w + 3.098 * h - 4.330 * a;
    const factor = t.activities.find(l => l.key === activity).factor;
    const tdee = bmr * factor;
    router.push({ pathname: '/plan', params: { tdee: tdee.toFixed(2), bmr: bmr.toFixed(2) } });
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          {/* Language Button — top right */}
          <TouchableOpacity style={s.langBtn} onPress={() => setShowLangModal(true)} activeOpacity={0.8}>
            <Text style={s.langFlag}>{t.flag}</Text>
            <Text style={s.langName}>{t.name}</Text>
            <Text style={s.langChevron}>▾</Text>
          </TouchableOpacity>

          <Text style={s.headerEmoji}>🥗</Text>
          <Text style={s.headerTitle}>{t.appTitle}</Text>
          <Text style={s.headerSub}>{t.appSubtitle}</Text>
        </View>

        {/* Gender */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>{t.gender}</Text>
          <View style={s.toggleRow}>
            {[['male', t.male], ['female', t.female]].map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[s.toggleBtn, gender === key && s.toggleBtnActive]}
                onPress={() => setGender(key)}
              >
                <Text style={[s.toggleText, gender === key && s.toggleTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Body Stats */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>{t.basicInfo}</Text>
          <View style={s.statRow}>
            {[
              { label: t.age,    value: age,    setter: setAge,    placeholder: t.ageUnit },
              { label: t.height, value: height, setter: setHeight, placeholder: t.heightUnit },
              { label: t.weight, value: weight, setter: setWeight, placeholder: t.weightUnit },
            ].map(({ label, value, setter, placeholder }) => (
              <View key={label} style={s.statBox}>
                <Text style={s.statLabel}>{label}</Text>
                <TextInput
                  style={s.statInput}
                  value={value}
                  onChangeText={setter}
                  keyboardType="numeric"
                  placeholder={placeholder}
                  placeholderTextColor={C.textSecondary}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Activity */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>{t.activityLevel}</Text>
          {t.activities.map(level => (
            <TouchableOpacity
              key={level.key}
              style={[s.activityRow, activity === level.key && s.activityRowActive]}
              onPress={() => setActivity(level.key)}
            >
              <View style={[s.activityDot, activity === level.key && s.activityDotActive]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.activityLabel, activity === level.key && s.activityLabelActive]}>
                  {level.label}
                </Text>
                <Text style={s.activityDesc}>{level.desc}</Text>
              </View>
              <Text style={[s.activityFactor, activity === level.key && s.activityFactorActive]}>
                ×{level.factor}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Calculate Button */}
        <TouchableOpacity
          style={[s.calcBtn, (!age || !height || !weight) && s.calcBtnDisabled]}
          onPress={handleCalculate}
          activeOpacity={0.85}
        >
          <Text style={s.calcBtnText}>{t.calculate}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Language Modal */}
      <Modal
        visible={showLangModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLangModal(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLangModal(false)}
        >
          <View style={s.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={s.modalTitle}>{t.langModalTitle}</Text>
            {LANG_KEYS.map(key => {
              const item = translations[key];
              const isActive = lang === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[s.langOption, isActive && s.langOptionActive]}
                  onPress={() => { setLang(key); setShowLangModal(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={s.langOptionFlag}>{item.flag}</Text>
                  <Text style={[s.langOptionName, isActive && s.langOptionNameActive]}>
                    {item.name}
                  </Text>
                  {isActive && <Text style={s.langOptionCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 20 },

  /* Header */
  header:      { alignItems: 'center', paddingTop: 20, paddingBottom: 20 },
  headerEmoji: { fontSize: 48, marginBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5, textAlign: 'center' },
  headerSub:   { fontSize: 13, color: C.textSecondary, marginTop: 4, textAlign: 'center' },

  /* Language Button */
  langBtn: {
    position: 'absolute', top: 16, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.card,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  langFlag:    { fontSize: 16 },
  langName:    { fontSize: 12, fontWeight: '700', color: C.textPrimary },
  langChevron: { fontSize: 10, color: C.textSecondary },

  /* Cards */
  card: {
    backgroundColor: C.card, borderRadius: 18, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },

  /* Gender Toggle */
  toggleRow:        { flexDirection: 'row', gap: 10 },
  toggleBtn:        { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 2, borderColor: C.border, alignItems: 'center' },
  toggleBtnActive:  { borderColor: C.primary, backgroundColor: '#F0FDF4' },
  toggleText:       { fontSize: 15, fontWeight: '700', color: C.textSecondary },
  toggleTextActive: { color: C.primaryDark },

  /* Stats Row */
  statRow:   { flexDirection: 'row', gap: 10 },
  statBox:   { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  statInput: {
    width: '100%', borderWidth: 2, borderColor: C.border, borderRadius: 12,
    paddingVertical: 12, fontSize: 18, fontWeight: '800',
    color: C.textPrimary, textAlign: 'center',
  },

  /* Activity */
  activityRow:          { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 2, borderColor: C.border, marginBottom: 8, gap: 12 },
  activityRowActive:    { borderColor: C.primary, backgroundColor: '#F0FDF4' },
  activityDot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: C.border },
  activityDotActive:    { backgroundColor: C.primary },
  activityLabel:        { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  activityLabelActive:  { color: C.primaryDark },
  activityDesc:         { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  activityFactor:       { fontSize: 13, fontWeight: '700', color: C.textSecondary },
  activityFactorActive: { color: C.primary },

  /* Calculate Button */
  calcBtn:         { backgroundColor: C.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  calcBtnDisabled: { backgroundColor: '#A7F3D0', shadowOpacity: 0 },
  calcBtnText:     { color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },

  /* Language Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalCard: {
    width: '100%', backgroundColor: C.card, borderRadius: 24,
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 12,
  },
  modalTitle: { fontSize: 15, fontWeight: '800', color: C.textPrimary, marginBottom: 16, textAlign: 'center' },

  langOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 13, paddingHorizontal: 14,
    borderRadius: 12, marginBottom: 6,
    backgroundColor: '#F9FAFB',
  },
  langOptionActive:     { backgroundColor: '#F0FDF4', borderWidth: 2, borderColor: C.primary },
  langOptionFlag:       { fontSize: 24 },
  langOptionName:       { flex: 1, fontSize: 15, fontWeight: '600', color: C.textPrimary },
  langOptionNameActive: { color: C.primaryDark, fontWeight: '800' },
  langOptionCheck:      { fontSize: 16, color: C.primary, fontWeight: '800' },
});
