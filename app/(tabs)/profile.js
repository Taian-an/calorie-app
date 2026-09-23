import {
  View, Text, Image, TouchableOpacity, TextInput,
  StyleSheet, ScrollView, SafeAreaView, Modal, Platform,
} from 'react-native';
import { useCallback, useState } from 'react';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useUserData } from '../../context/UserDataContext';
import translations, { LANG_KEYS } from '../../constants/translations';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

const C = {
  primary:       '#22C55E',
  primaryDark:   '#16A34A',
  bg:            '#F0FDF4',
  card:          '#FFFFFF',
  textPrimary:   '#14532D',
  textSecondary: '#6B7280',
  border:        '#E5E7EB',
};

function bmiInfo(val, t) {
  if (val < 18.5) return { label: t.bmiUnder  ?? 'Underweight', color: '#3B82F6', bg: '#EFF6FF' };
  if (val < 24)   return { label: t.bmiNormal ?? 'Normal',      color: '#22C55E', bg: '#F0FDF4' };
  if (val < 28)   return { label: t.bmiOver   ?? 'Overweight',  color: '#F97316', bg: '#FFF7ED' };
  return             { label: t.bmiObese  ?? 'Obese',       color: '#EF4444', bg: '#FEF2F2' };
}

// 標準無頭像圖框——新帳號一律用這個，不再提供內建卡通頭像可選
export const AVATARS = {
  default: require('../../avatars/avatar.png'),
};
// avatarKey 平常就是 'default'，使用者從本機相簿選圖後，
// 這欄會直接存那張圖的本機 uri，不是內建 key，靠 URI 的 scheme 判斷該讀哪一種
const isCustomAvatarUri = (key) => typeof key === 'string' && /^(file:|content:|data:|blob:|https?:)/.test(key);
const avatarSource = (key) => (isCustomAvatarUri(key) ? { uri: key } : AVATARS.default);

// 活動程度圖示（對應 activities 的 key）
const ACTIVITY_EMOJI = {
  sedentary:  '🧘',
  lightly:    '🚶',
  moderately: '🏃',
  very:       '🏋️',
  extra:      '🥊',
};

// ── Sub-components ────────────────────────────────────────────────
function StatCard({ value, unit, label, color, bg, onInfoPress }) {
  return (
    <View style={[s.statCard, { backgroundColor: bg ?? C.card }]}>
      <TouchableOpacity style={s.statInfoBtn} onPress={onInfoPress} hitSlop={8} activeOpacity={0.6}>
        <Ionicons name="information-circle-outline" size={16} color={C.textSecondary} />
      </TouchableOpacity>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      {unit ? <Text style={s.statUnit}>{unit}</Text> : null}
      <Text style={s.statCardLabel}>{label}</Text>
    </View>
  );
}

// 一列設定/資料：左邊 icon+標題，右邊值＋箭頭（onPress 為空時純顯示）
function SettingRow({ icon, label, value, valueColor, onPress, isLast }) {
  const inner = (
    <View style={[s.settingRow, !isLast && s.settingRowBorder]}>
      <View style={s.settingLeft}>
        <View style={s.settingIconBox}>
          <Ionicons name={icon} size={18} color={C.primaryDark} />
        </View>
        <Text style={s.settingLabel}>{label}</Text>
      </View>
      <View style={s.settingRight}>
        {value != null && (
          <Text style={[s.settingValue, valueColor ? { color: valueColor } : null]} numberOfLines={1}>
            {value}
          </Text>
        )}
        {onPress && <Ionicons name="chevron-forward" size={16} color={C.textSecondary} />}
      </View>
    </View>
  );
  if (!onPress) return inner;
  return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{inner}</TouchableOpacity>;
}

// ── Main Screen ───────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();
  const { profile, updateProfile, authEmail, logout, deleteAccount, refreshProfile } = useUserData();
  const [deleting, setDeleting] = useState(false);

  // 刪除帳號要二次確認（破壞性、不可復原）。原生用系統 Alert 的 destructive 樣式，網頁版沒有 Alert 按鈕，改用 window.confirm
  const confirmDeleteAccount = () => {
    const run = async () => {
      setDeleting(true);
      try {
        await deleteAccount();
        router.replace('/login');
      } catch (err) {
        console.error('[delete account]', err);
        if (Platform.OS === 'web') window.alert(t.deleteAccountFailed);
        else require('react-native').Alert.alert(t.deleteAccount, t.deleteAccountFailed);
      } finally {
        setDeleting(false);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`${t.deleteAccountTitle}\n\n${t.deleteAccountMsg}`)) run();
      return;
    }
    require('react-native').Alert.alert(t.deleteAccountTitle, t.deleteAccountMsg, [
      { text: t.deleteAccountCancel, style: 'cancel' },
      { text: t.deleteAccountConfirm, style: 'destructive', onPress: run },
    ]);
  };
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [infoModal, setInfoModal] = useState(null); // 'bmi' | 'tdee' | 'bmr' | null —— 統計方框的公式說明
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // 每次切回個人頁都跟後端要一次最新 profile，讓後台/資料庫端改過的資料（例如改名）不用登出重登就能看到
  useFocusEffect(
    useCallback(() => {
      if (authEmail) refreshProfile().catch(() => {});
    }, [authEmail, refreshProfile])
  );

  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      setFeedbackMsg({ error: true, text: t.feedbackEmptyError });
      return;
    }
    setFeedbackBusy(true);
    setFeedbackMsg(null);
    try {
      await axios.post(`${API_BASE}/feedback`, { message: feedbackText.trim(), email: authEmail ?? undefined });
      setFeedbackText('');
      setFeedbackMsg({ error: false, text: t.feedbackSuccess });
    } catch {
      setFeedbackMsg({ error: true, text: t.feedbackError });
    } finally {
      setFeedbackBusy(false);
    }
  };

  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
    setFeedbackMsg(null);
  };

  const [name,      setName]      = useState('');
  const [avatarKey, setAvatarKey] = useState('default');
  const [age,      setAge]      = useState('');
  const [gender,   setGender]   = useState('male');
  const [height,   setHeight]   = useState('');
  const [weight,   setWeight]   = useState('');
  const [activity, setActivity] = useState('sedentary');

  const openEditModal = () => {
    if (profile) {
      setName(profile.name ?? '');
      setAvatarKey(profile.avatarKey ?? 'default');
      setAge(String(profile.age));
      setGender(profile.gender);
      setHeight(String(profile.height));
      setWeight(String(profile.weight));
      setActivity(profile.activity);
    }
    setShowEditModal(true);
  };

  const handleSave = () => {
    if (!age || !height || !weight) return;
    const w = parseFloat(weight), h = parseFloat(height), a = parseFloat(age);
    const bmr = gender === 'male'
      ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a
      : 447.593 + 9.247 * w + 3.098 * h - 4.330 * a;
    const factor = t.activities.find(l => l.key === activity).factor;
    const tdee = bmr * factor;
    // 保留首頁選的目標模式（增肌/減脂/維持），依新 TDEE 重算目標熱量
    const goal = profile?.goal ?? 'maintain';
    const delta = goal === 'bulk' ? 300 : goal === 'cut' ? -400 : 0;
    updateProfile({
      name: name.trim(), avatarKey,
      age: a, gender, height: h, weight: w, activity, bmr, tdee,
      goal, target: tdee + delta,
    });
    setShowEditModal(false);
  };

  // 帳號與同步卡（登入前後兩種狀態），空狀態頁也要有：新裝置的舊用戶靠它拉回資料
  const accountCard = (
    <View style={s.card}>
      <Text style={s.cardTitle}>☁️ {t.accountSync}</Text>
      <View style={s.divider} />
      {authEmail ? (
        <>
          <View style={s.authRow}>
            <Ionicons name="checkmark-circle" size={20} color={C.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.authEmail}>{authEmail}</Text>
              <Text style={s.authStatus}>{t.loggedInAs}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.logoutBtn}
            onPress={() => { logout(); router.push('/login'); }}
            activeOpacity={0.8}
          >
            <Text style={s.logoutBtnText}>{t.logoutBtn}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.deleteAccountBtn}
            onPress={confirmDeleteAccount}
            disabled={deleting}
            activeOpacity={0.7}
          >
            <Text style={s.deleteAccountText}>{deleting ? '…' : t.deleteAccount}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={s.authHint}>{t.loginPromptText}</Text>
          <TouchableOpacity
            style={[s.authBtn, s.authBtnPrimary, { marginTop: 12 }]}
            onPress={() => router.push('/login')}
            activeOpacity={0.8}
          >
            <Text style={s.authBtnText}>{t.loginPromptBtn}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  if (!profile) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={{ padding: 18 }}>
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>🥗</Text>
            <Text style={s.emptyText}>{t.noDataYet}</Text>
            <TouchableOpacity style={s.editBtnSolid} onPress={openEditModal} activeOpacity={0.85}>
              <Text style={s.editBtnSolidText}>{t.editProfile}</Text>
            </TouchableOpacity>
          </View>
          {accountCard}
        </ScrollView>
        <EditProfileModal
          visible={showEditModal} onClose={() => setShowEditModal(false)} onSave={handleSave}
          t={t}
          name={name} setName={setName} avatarKey={avatarKey} setAvatarKey={setAvatarKey}
          age={age} setAge={setAge} gender={gender} setGender={setGender}
          height={height} setHeight={setHeight} weight={weight} setWeight={setWeight}
          activity={activity} setActivity={setActivity}
        />
      </SafeAreaView>
    );
  }

  const bmi = profile.weight / Math.pow(profile.height / 100, 2);
  const bmiData = bmiInfo(bmi, t);
  const genderLabel = (profile.gender === 'male' ? t.male : t.female)?.replace(/^[^\s]+\s/, '');

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero Header ── */}
        <View style={s.hero}>
          <View style={s.avatarWrap}>
            <Image source={avatarSource(profile.avatarKey)} style={s.avatar} />
          </View>
          {!!profile.name && <Text style={s.heroName}>{profile.name}</Text>}
          <Text style={s.heroBio}>
            {profile.age}{t.ageUnit}・{genderLabel}・{profile.height} cm・{profile.weight} kg
          </Text>
          <TouchableOpacity style={s.editBtn} activeOpacity={0.8} onPress={openEditModal}>
            <Ionicons name="pencil-outline" size={14} color="#FFF" />
            <Text style={s.editBtnText}>{t.editProfile}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.body}>

          {/* ── BMI / TDEE / BMR 統計方框 ── */}
          <View style={s.statsRow}>
            <StatCard value={bmi.toFixed(1)} label={`BMI・${bmiData.label}`} color={bmiData.color} bg={bmiData.bg} onInfoPress={() => setInfoModal('bmi')} />
            <StatCard value={Math.round(profile.tdee).toLocaleString()} unit="kcal" label="TDEE" color={C.primaryDark} bg="#F0FDF4" onInfoPress={() => setInfoModal('tdee')} />
            <StatCard value={Math.round(profile.bmr).toLocaleString()} unit="kcal" label="BMR" color="#8B5CF6" bg="#F5F3FF" onInfoPress={() => setInfoModal('bmr')} />
          </View>

          {/* ── Personal Info ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>📋 {t.personalInfo}</Text>
            <View style={s.divider} />
            <SettingRow icon="person-outline"  label={t.gender} value={genderLabel} onPress={openEditModal} />
            <SettingRow icon="calendar-outline" label={t.age}    value={`${profile.age} ${t.ageUnit}`} onPress={openEditModal} />
            <SettingRow icon="resize-outline"  label={t.height} value={`${profile.height} cm`} onPress={openEditModal} />
            <SettingRow icon="scale-outline"   label={t.weight} value={`${profile.weight} kg`} onPress={openEditModal} />
            <SettingRow icon="walk-outline"    label={t.activityLevel} value={t.activities?.find(a => a.key === profile.activity)?.label} onPress={openEditModal} />
            <SettingRow icon="calculator-outline" label="BMI" value={`${bmi.toFixed(1)}・${bmiData.label}`} valueColor={bmiData.color} isLast />
          </View>

          {/* ── Account & Sync ── */}
          {accountCard}

          {/* ── App Settings ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>⚙️ {t.appSettings}</Text>
            <View style={s.divider} />
            <SettingRow icon="language-outline" label={t.languageLabel} value={`${t.flag} ${t.name}`} onPress={() => setShowLangModal(true)} />
            <SettingRow icon="contrast-outline" label={t.appearanceLabel} value={t.appearanceSystem} onPress={() => {}} />
            <SettingRow icon="notifications-outline" label={t.setNotify} onPress={() => {}} />
            <SettingRow icon="options-outline"  label={t.setUnits} onPress={() => {}} />
            <SettingRow icon="shield-checkmark-outline" label={t.setPrivacy} onPress={() => {}} />
            <SettingRow icon="chatbox-ellipses-outline" label={t.sendFeedback} onPress={() => setShowFeedbackModal(true)} />
            <SettingRow icon="information-circle-outline" label={t.setAbout} onPress={() => {}} isLast />
          </View>

          {/* ── App version ── */}
          <Text style={s.version}>AI Calorie Tracker v1.0.0</Text>
          <Text style={s.versionSub}>Powered by Google Vision × USDA FoodData</Text>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      <EditProfileModal
        visible={showEditModal} onClose={() => setShowEditModal(false)} onSave={handleSave}
        t={t}
        name={name} setName={setName} avatarKey={avatarKey} setAvatarKey={setAvatarKey}
        age={age} setAge={setAge} gender={gender} setGender={setGender}
        height={height} setHeight={setHeight} weight={weight} setWeight={setWeight}
        activity={activity} setActivity={setActivity}
      />

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
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={s.langModalCard}>
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
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Feedback Modal */}
      <Modal
        visible={showFeedbackModal}
        transparent
        animationType="fade"
        onRequestClose={closeFeedbackModal}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={closeFeedbackModal}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={s.langModalCard}>
            <Text style={s.modalTitle}>{t.feedbackModalTitle}</Text>
            <TextInput
              style={s.feedbackInput}
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder={t.feedbackPlaceholder}
              placeholderTextColor={C.textSecondary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            {feedbackMsg && (
              <Text style={[s.feedbackMsg, feedbackMsg.error && s.feedbackMsgError]}>
                {feedbackMsg.text}
              </Text>
            )}
            <TouchableOpacity
              style={[s.editBtnSolid, { alignSelf: 'stretch', alignItems: 'center', marginTop: 14 }, feedbackBusy && { opacity: 0.6 }]}
              onPress={submitFeedback}
              disabled={feedbackBusy}
              activeOpacity={0.85}
            >
              <Text style={s.editBtnSolidText}>{feedbackBusy ? '…' : t.feedbackSubmit}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Stat formula info modal（BMI / TDEE / BMR 點 info 圖示看公式） */}
      <Modal
        visible={!!infoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModal(null)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setInfoModal(null)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={s.langModalCard}>
            {infoModal === 'bmi' && (() => {
              const heightM = profile.height / 100;
              return (
                <>
                  <Text style={s.modalTitle}>{t.bmiFormulaTitle}</Text>
                  <Text style={s.formulaText}>{t.bmiFormula}</Text>
                  <View style={s.formulaDivider} />
                  <Text style={s.formulaSubLabel}>{t.yourNumbers}</Text>
                  <Text style={s.formulaSub}>{profile.weight} ÷ ({profile.height}/100)²</Text>
                  <Text style={s.formulaResult}>= {bmi.toFixed(1)} ・ {bmiData.label}</Text>
                </>
              );
            })()}

            {infoModal === 'bmr' && (() => {
              const isMale = profile.gender === 'male';
              return (
                <>
                  <Text style={s.modalTitle}>{t.bmrFormulaTitle}</Text>
                  <Text style={[s.formulaText, isMale && s.formulaTextActive]}>{t.bmrFormulaMale}</Text>
                  <Text style={[s.formulaText, !isMale && s.formulaTextActive]}>{t.bmrFormulaFemale}</Text>
                  <View style={s.formulaDivider} />
                  <Text style={s.formulaSubLabel}>{t.yourNumbers}</Text>
                  <Text style={s.formulaSub}>
                    {isMale
                      ? `88.362 + 13.397×${profile.weight} + 4.799×${profile.height} − 5.677×${profile.age}`
                      : `447.593 + 9.247×${profile.weight} + 3.098×${profile.height} − 4.330×${profile.age}`}
                  </Text>
                  <Text style={s.formulaResult}>= {Math.round(profile.bmr).toLocaleString()} kcal</Text>
                </>
              );
            })()}

            {infoModal === 'tdee' && (() => {
              const activity = t.activities.find(l => l.key === profile.activity);
              return (
                <>
                  <Text style={s.modalTitle}>{t.tdeeFormulaTitle}</Text>
                  <Text style={s.formulaText}>{t.tdeeFormula}</Text>
                  <View style={s.formulaDivider} />
                  <Text style={s.formulaSubLabel}>{t.yourNumbers}</Text>
                  <Text style={s.formulaSub}>
                    BMR {Math.round(profile.bmr).toLocaleString()} × {t.activityLevel}「{activity?.label}」({activity?.factor})
                  </Text>
                  <Text style={s.formulaResult}>= {Math.round(profile.tdee).toLocaleString()} kcal</Text>
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ── Edit Profile Modal ─────────────────────────────────────────────
function EditProfileModal({
  visible, onClose, onSave, t,
  name, setName, avatarKey, setAvatarKey,
  age, setAge, gender, setGender,
  height, setHeight, weight, setWeight,
  activity, setActivity,
}) {
  // 從手機相簿選一張照片當頭像，直接把選到的本機 uri 存進 avatarKey
  const pickAvatarFromLibrary = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setAvatarKey(result.assets[0].uri);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlayBottom}>
        <View style={s.editModalCard}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.modalTitle}>{t.editProfile}</Text>

            {/* 頭像：不再提供內建卡通頭像可選，一律用標準無頭像圖框，只能從相簿換成自己的照片 */}
            <Text style={s.sectionLabel}>{t.avatarLabel}</Text>
            <View style={s.avatarRow}>
              <Image source={avatarSource(avatarKey)} style={s.avatarOption} />
              <TouchableOpacity onPress={pickAvatarFromLibrary} activeOpacity={0.8} style={s.avatarAddBtn}>
                <Ionicons name="image-outline" size={22} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* 名字 */}
            <Text style={[s.sectionLabel, { marginTop: 16 }]}>{t.nameLabel}</Text>
            <TextInput
              style={s.nameInput}
              value={name}
              onChangeText={setName}
              placeholder={t.namePlaceholder}
              placeholderTextColor={C.textSecondary}
              maxLength={20}
            />

            {/* 性別 */}
            <Text style={[s.sectionLabel, { marginTop: 16 }]}>{t.gender}</Text>
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

            {/* 年齡 */}
            <Text style={[s.sectionLabel, { marginTop: 16 }]}>{t.age}</Text>
            <TextInput
              style={s.nameInput}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder={t.ageUnit}
              placeholderTextColor={C.textSecondary}
            />

            {/* 身高、體重 */}
            <Text style={[s.sectionLabel, { marginTop: 16 }]}>{t.basicInfo}</Text>
            <View style={s.statRow}>
              {[
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

            {/* 活動程度（icon＋標題＋說明＋勾選） */}
            <Text style={[s.sectionLabel, { marginTop: 16 }]}>{t.activityLevel}</Text>
            {t.activities.map(level => {
              const isSel = activity === level.key;
              return (
                <TouchableOpacity
                  key={level.key}
                  style={[s.activityRow, isSel && s.activityRowActive]}
                  onPress={() => setActivity(level.key)}
                  activeOpacity={0.75}
                >
                  <Text style={s.activityEmoji}>{ACTIVITY_EMOJI[level.key] ?? '🏃'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.activityLabel, isSel && s.activityLabelActive]}>{level.label}</Text>
                    <Text style={s.activityDesc}>{level.desc}</Text>
                  </View>
                  {isSel && <Ionicons name="checkmark" size={20} color={C.primaryDark} />}
                </TouchableOpacity>
              );
            })}

            <View style={s.modalButtonRow}>
              <TouchableOpacity style={[s.btn, s.cancelBtn]} onPress={onClose}>
                <Text style={s.btnText}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.saveBtn, (!age || !height || !weight) && s.saveBtnDisabled]}
                onPress={onSave}
                disabled={!age || !height || !weight}
              >
                <Text style={s.btnText}>{t.calculate}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyText:  { fontSize: 15, color: C.textSecondary, marginBottom: 20 },
  editBtnSolid: { backgroundColor: C.primary, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32 },
  editBtnSolidText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  /* Hero */
  hero: {
    backgroundColor: C.primaryDark,
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatarWrap: { marginBottom: 14 },
  avatar:     { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: '#FFF' },
  heroName:   { fontSize: 20, fontWeight: '900', color: '#FFF', letterSpacing: 0.3 },
  heroBio:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 5, fontWeight: '500' },
  editBtn:    {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
  },
  editBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  body: { paddingHorizontal: 18, paddingTop: 20 },

  /* BMI / TDEE / BMR 統計方框 */
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, borderRadius: 16, padding: 12, paddingTop: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statInfoBtn:   { position: 'absolute', top: 8, right: 8, padding: 2 },
  statValue:     { fontSize: 18, fontWeight: '900' },
  statUnit:      { fontSize: 10, color: C.textSecondary, fontWeight: '600' },
  statCardLabel: { fontSize: 10, color: C.textSecondary, marginTop: 3, textAlign: 'center', fontWeight: '600' },

  /* Stat formula info modal */
  formulaText:       { fontSize: 13.5, color: C.textSecondary, fontWeight: '600', lineHeight: 20 },
  formulaTextActive: { color: C.textPrimary },
  formulaDivider:    { height: 1, backgroundColor: C.border, marginVertical: 12 },
  formulaSubLabel:   { fontSize: 11, color: C.textSecondary, fontWeight: '700', marginBottom: 6 },
  formulaSub:        { fontSize: 13, color: C.textPrimary, fontWeight: '600', lineHeight: 19 },
  formulaResult:     { fontSize: 16, color: C.primaryDark, fontWeight: '900', marginTop: 8 },

  /* Cards */
  card: {
    backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  divider:   { height: 1, backgroundColor: C.border, marginVertical: 12 },

  /* Setting rows */
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  settingLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  settingIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },
  settingLabel:   { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  settingRight:   { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  settingValue:   { fontSize: 13, fontWeight: '700', color: C.textSecondary },

  /* Account & Sync */
  authRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  authEmail:  { fontSize: 14, fontWeight: '800', color: C.textPrimary },
  authStatus: { fontSize: 11, color: C.textSecondary, marginTop: 2 },
  logoutBtn: {
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    paddingVertical: 11, alignItems: 'center',
  },
  logoutBtnText: { fontSize: 13, fontWeight: '700', color: C.textSecondary },
  deleteAccountBtn: { alignSelf: 'center', marginTop: 14, paddingVertical: 6, paddingHorizontal: 12 },
  deleteAccountText: { fontSize: 13, fontWeight: '600', color: '#E5484D' },
  authBtn:        { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  authBtnPrimary: { backgroundColor: C.primary },
  authBtnText:    { fontSize: 14, fontWeight: '800', color: '#FFF' },
  authHint:  { fontSize: 11, color: C.textSecondary, marginTop: 10, textAlign: 'center' },

  /* Footer */
  version:    { textAlign: 'center', fontSize: 12, color: C.textSecondary, fontWeight: '600', marginTop: 4 },
  versionSub: { textAlign: 'center', fontSize: 10, color: '#9CA3AF', marginTop: 4 },

  /* Modals（共用） */
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 32 },
  modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: C.textPrimary, marginBottom: 16, textAlign: 'center' },

  /* Language Modal */
  langModalCard: {
    backgroundColor: C.card, borderRadius: 24, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 12,
  },
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

  /* Feedback Modal */
  feedbackInput: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14, minHeight: 110,
    fontSize: 14, color: C.textPrimary,
  },
  feedbackMsg:      { fontSize: 12, color: C.primaryDark, marginTop: 10, textAlign: 'center', fontWeight: '600' },
  feedbackMsgError: { color: '#DC2626' },

  /* Edit Modal */
  editModalCard: {
    width: '100%', maxHeight: '85%', backgroundColor: C.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },

  /* 頭像 */
  avatarRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center' },
  avatarOption: { width: 60, height: 60, borderRadius: 30 },
  avatarAddBtn: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg,
  },

  /* 名字 / 年齡輸入 */
  nameInput: {
    borderWidth: 2, borderColor: C.border, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    fontSize: 16, fontWeight: '700', color: C.textPrimary,
  },

  toggleRow:        { flexDirection: 'row', gap: 10 },
  toggleBtn:        { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 2, borderColor: C.border, alignItems: 'center' },
  toggleBtnActive:  { borderColor: C.primary, backgroundColor: '#F0FDF4' },
  toggleText:       { fontSize: 15, fontWeight: '700', color: C.textSecondary },
  toggleTextActive: { color: C.primaryDark },

  statRow:   { flexDirection: 'row', gap: 10 },
  statBox:   { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, fontWeight: '700', color: C.textSecondary, marginBottom: 6 },
  statInput: {
    width: '100%', borderWidth: 2, borderColor: C.border, borderRadius: 12,
    paddingVertical: 12, fontSize: 18, fontWeight: '800',
    color: C.textPrimary, textAlign: 'center',
  },

  activityRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16,
    backgroundColor: '#F9FAFB', marginBottom: 8, gap: 12,
    borderWidth: 2, borderColor: 'transparent',
  },
  activityRowActive:   { borderColor: C.primary, backgroundColor: '#F0FDF4' },
  activityEmoji:       { fontSize: 24, width: 32, textAlign: 'center' },
  activityLabel:       { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  activityLabelActive: { color: C.primaryDark },
  activityDesc:        { fontSize: 12, color: C.textSecondary, marginTop: 2 },

  modalButtonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn:            { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  cancelBtn:      { backgroundColor: '#F3F4F6', flex: 0, paddingHorizontal: 24 },
  saveBtn:        { backgroundColor: C.primary },
  saveBtnDisabled:{ backgroundColor: '#A7F3D0' },
  btnText:        { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
