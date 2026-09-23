import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Animated, Easing,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useUserData } from '../context/UserDataContext';

const C = {
  primary:       '#22C55E',
  primaryDark:   '#16A34A',
  bg:            '#F0FDF4',
  card:          '#FFFFFF',
  textPrimary:   '#14532D',
  textSecondary: '#6B7280',
  border:        '#D1D5DB',
  warn:          '#F97316',
};

const ACTIVITY_EMOJI = { sedentary: '🧘', lightly: '🚶', moderately: '🏃', very: '🏋️', extra: '🥊' };
const DURATIONS = [
  { key: '4',  label: '1 個月' },
  { key: '12', label: '3 個月' },
  { key: '24', label: '6 個月' },
  { key: '52', label: '1 年' },
];
const TOTAL_STEPS = 7;
const BUILD_MS = 2200;

// 註冊/登入成功但還沒填過身體資料（profile.height 是 null）的使用者，進 App 前一定會先卡在這裡。
// 完成後直接呼叫跟「編輯個人資料」同一套 updateProfile()，所以後續在個人頁改資料用的是同一份計算邏輯。
export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { updateProfile } = useUserData();

  const [phase, setPhase] = useState('wizard'); // 'wizard' | 'building' | 'done'
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState('male');
  const [age, setAge] = useState(25);
  const [height, setHeight] = useState(165);
  const [weight, setWeight] = useState(60);
  const [targetWeight, setTargetWeight] = useState(60);
  const [durationKey, setDurationKey] = useState('12');
  const [customMonths, setCustomMonths] = useState('3');
  const [activity, setActivity] = useState('sedentary');
  const [result, setResult] = useState(null);

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const durationWeeks = durationKey === 'other'
    ? Math.max(1, (parseFloat(customMonths) || 0) * 4)
    : parseInt(durationKey, 10);

  // 按最後一步的「完成」：先算好結果，進入建立動畫，動畫跑完才真的存檔放行
  const startBuilding = () => {
    const w = weight, h = height, a = age;
    const bmr = gender === 'male'
      ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a
      : 447.593 + 9.247 * w + 3.098 * h - 4.330 * a;
    const factor = t.activities.find(l => l.key === activity).factor;
    const tdee = bmr * factor;
    const goal = targetWeight > weight + 0.3 ? 'bulk' : targetWeight < weight - 0.3 ? 'cut' : 'maintain';
    const delta = goal === 'bulk' ? 300 : goal === 'cut' ? -400 : 0;
    setResult({ age: a, gender, height: h, weight: w, activity, bmr, tdee, goal, target: tdee + delta });
    setPhase('building');
  };

  const finish = () => {
    updateProfile(result);
    router.replace('/(tabs)');
  };

  const bmi = weight / ((height / 100) ** 2);
  const bmiTag = bmi < 18.5 ? { label: '過輕', color: '#3B82F6' }
    : bmi < 24 ? { label: '健康', color: C.primary }
    : bmi < 28 ? { label: '偏重', color: C.warn }
    : { label: '過重', color: '#EF4444' };

  const weightDiff = targetWeight - weight;
  const weeklyRate = Math.abs(weightDiff) / (durationWeeks / 4);

  if (phase === 'building' || phase === 'done') {
    return <BuildingScreen phase={phase} onBuilt={() => setPhase('done')} result={result} onContinue={finish} />;
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={back} disabled={step === 0} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={step === 0 ? 'transparent' : C.textPrimary} />
        </TouchableOpacity>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
        </View>
        <Text style={s.stepCount}>{step + 1}/{TOTAL_STEPS}</Text>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <>
            <Text style={s.title}>選擇你的性別</Text>
            <Text style={s.subtitle}>男性的基礎代謝率通常比女性更高。</Text>
            <View style={s.genderRow}>
              {[{ key: 'male', label: '男性', emoji: '🙋‍♂️' }, { key: 'female', label: '女性', emoji: '🙋‍♀️' }].map(g => (
                <TouchableOpacity
                  key={g.key}
                  style={[s.genderCard, gender === g.key && s.genderCardActive]}
                  onPress={() => setGender(g.key)}
                  activeOpacity={0.85}
                >
                  <Text style={s.genderEmoji}>{g.emoji}</Text>
                  <Text style={[s.genderLabel, gender === g.key && s.genderLabelActive]}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={s.title}>你的年齡是？</Text>
            <Text style={s.subtitle}>隨著年齡增長，基礎代謝會逐漸下降。點數字可以直接輸入。</Text>
            <Stepper value={age} onChange={setAge} unit="歲" min={13} max={100} />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={s.title}>你的身高是多少？</Text>
            <Text style={s.subtitle}>身高和體重是決定基礎代謝率的重要指標。點數字可以直接輸入。</Text>
            <Stepper value={height} onChange={setHeight} unit="cm" step={1} min={100} max={230} />
          </>
        )}

        {step === 3 && (
          <>
            <Text style={s.title}>你目前的體重是？</Text>
            <Text style={s.subtitle}>身高和體重是決定基礎代謝率的重要指標。點數字可以直接輸入。</Text>
            <Stepper value={weight} onChange={setWeight} unit="kg" step={0.5} min={30} max={250} />
            <View style={[s.feedbackCard, { borderColor: bmiTag.color }]}>
              <View style={s.bmiRow}>
                <Text style={s.bmiLabel}>BMI</Text>
                <Text style={[s.bmiValue, { color: bmiTag.color }]}>{bmi.toFixed(1)} · {bmiTag.label}</Text>
              </View>
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <Text style={s.title}>你的理想體重是？</Text>
            <Text style={s.subtitle}>目標體重會影響你的每日熱量預算。點數字可以直接輸入。</Text>
            <Stepper value={targetWeight} onChange={setTargetWeight} unit="kg" step={0.5} min={30} max={250} />
            <View style={s.feedbackCard}>
              <Text style={s.feedbackText}>
                {Math.abs(weightDiff) < 0.3
                  ? '維持目前體重'
                  : `你將${weightDiff > 0 ? '增加' : '減少'} ${Math.abs(weightDiff).toFixed(1)} kg`}
              </Text>
            </View>
          </>
        )}

        {step === 5 && (
          <>
            <Text style={s.title}>你想多久達到目標？</Text>
            <Text style={s.subtitle}>時間長短會影響你的每週節奏，越急促難度越高。</Text>
            <View style={s.durationGrid}>
              {DURATIONS.map(d => (
                <TouchableOpacity
                  key={d.key}
                  style={[s.durationChip, durationKey === d.key && s.durationChipActive]}
                  onPress={() => setDurationKey(d.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.durationChipText, durationKey === d.key && s.durationChipTextActive]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[s.durationChip, durationKey === 'other' && s.durationChipActive]}
                onPress={() => setDurationKey('other')}
                activeOpacity={0.85}
              >
                <Text style={[s.durationChipText, durationKey === 'other' && s.durationChipTextActive]}>其他</Text>
              </TouchableOpacity>
            </View>

            {durationKey === 'other' && (
              <View style={s.customDurationRow}>
                <TextInput
                  style={s.customDurationInput}
                  value={customMonths}
                  onChangeText={txt => setCustomMonths(txt.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="3"
                  placeholderTextColor={C.textSecondary}
                />
                <Text style={s.customDurationUnit}>個月</Text>
              </View>
            )}

            {Math.abs(weightDiff) >= 0.3 && (
              <View style={s.feedbackCard}>
                <Text style={s.feedbackText}>
                  平均每個月{weightDiff > 0 ? '增加' : '減少'} 約 {weeklyRate.toFixed(1)} kg
                </Text>
              </View>
            )}
          </>
        )}

        {step === 6 && (
          <>
            <Text style={s.title}>你的活動量如何？</Text>
            <Text style={s.subtitle}>這會用來估算你的每日熱量消耗。</Text>
            {t.activities.map(level => {
              const isSel = activity === level.key;
              return (
                <TouchableOpacity
                  key={level.key}
                  style={[s.activityRow, isSel && s.activityRowActive]}
                  onPress={() => setActivity(level.key)}
                  activeOpacity={0.85}
                >
                  <Text style={s.activityEmoji}>{ACTIVITY_EMOJI[level.key] ?? '🏃'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.activityLabel, isSel && s.activityLabelActive]}>{level.label}</Text>
                    <Text style={s.activityDesc}>{level.desc}</Text>
                  </View>
                  {isSel && <Ionicons name="checkmark-circle" size={22} color={C.primary} />}
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.btn} onPress={step === TOTAL_STEPS - 1 ? startBuilding : next} activeOpacity={0.85}>
          <Text style={s.btnText}>{step === TOTAL_STEPS - 1 ? '完成' : '繼續'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// 數字可以用左右按鈕微調，也可以直接點數字叫出鍵盤輸入
function Stepper({ value, onChange, unit, step = 1, min, max }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const clamp = (v) => Math.min(max, Math.max(min, v));

  const openEdit = () => { setDraft(String(value)); setEditing(true); };
  const commit = () => {
    const parsed = parseFloat(draft);
    if (!Number.isNaN(parsed)) onChange(clamp(+parsed.toFixed(1)));
    setEditing(false);
  };

  return (
    <View style={s.stepperRow}>
      <TouchableOpacity style={s.stepperBtn} onPress={() => onChange(clamp(+(value - step).toFixed(1)))} activeOpacity={0.7}>
        <Ionicons name="remove" size={22} color={C.primaryDark} />
      </TouchableOpacity>

      {editing ? (
        <View style={s.stepperValueWrap}>
          <TextInput
            style={s.stepperInput}
            value={draft}
            onChangeText={setDraft}
            keyboardType="decimal-pad"
            autoFocus
            selectTextOnFocus
            onBlur={commit}
            onSubmitEditing={commit}
          />
          <Text style={s.stepperUnit}>{unit}</Text>
        </View>
      ) : (
        <TouchableOpacity style={s.stepperValueWrap} onPress={openEdit} activeOpacity={0.6}>
          <Text style={s.stepperValue}>{value}</Text>
          <Text style={s.stepperUnit}>{unit}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={s.stepperBtn} onPress={() => onChange(clamp(+(value + step).toFixed(1)))} activeOpacity={0.7}>
        <Ionicons name="add" size={22} color={C.primaryDark} />
      </TouchableOpacity>
    </View>
  );
}

// 完成問卷後的「建立計劃中 0→100% → 已完成」轉場，跑完動畫才真的存檔放行進 App
function BuildingScreen({ phase, onBuilt, result, onContinue }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [percent, setPercent] = useState(0);
  const checkScale = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const id = anim.addListener(({ value }) => setPercent(Math.round(value)));
    Animated.timing(anim, {
      toValue: 100,
      duration: BUILD_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => onBuilt());
    return () => anim.removeListener(id);
  }, []);

  useEffect(() => {
    if (phase === 'done') {
      Animated.spring(checkScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    }
  }, [phase]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.buildWrap}>
        {phase === 'building' ? (
          <>
            <Text style={s.buildPercent}>{percent}%</Text>
            <View style={s.buildTrack}>
              <Animated.View
                style={[
                  s.buildFill,
                  { width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
                ]}
              />
            </View>
            <Text style={s.buildTitle}>正在為你打造專屬計劃…</Text>
            <Text style={s.buildSubtitle}>根據你的資料計算每日熱量與營養素目標</Text>
          </>
        ) : (
          <>
            <Animated.View style={[s.checkCircle, { transform: [{ scale: checkScale }] }]}>
              <Ionicons name="checkmark" size={48} color="#FFF" />
            </Animated.View>
            <Text style={s.buildTitle}>計劃已制定完成！</Text>
            <Text style={s.buildSubtitle}>
              {result ? `每日建議攝取約 ${Math.round(result.target)} kcal` : ''}
            </Text>
            <TouchableOpacity style={[s.btn, s.doneBtn]} onPress={onContinue} activeOpacity={0.85}>
              <Text style={s.btnText}>繼續</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#DCFCE7', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
  stepCount: { fontSize: 13, fontWeight: '700', color: C.primaryDark, width: 34, textAlign: 'right' },

  body: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '900', color: C.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: C.textSecondary, marginBottom: 32, lineHeight: 20 },

  genderRow: { flexDirection: 'row', gap: 14, marginTop: 8 },
  genderCard: {
    flex: 1, borderWidth: 1.5, borderColor: C.border, borderRadius: 16,
    paddingVertical: 32, alignItems: 'center', backgroundColor: C.card,
  },
  genderCardActive: { borderColor: C.primary, backgroundColor: '#F0FDF4' },
  genderEmoji: { fontSize: 40, marginBottom: 10 },
  genderLabel: { fontSize: 16, fontWeight: '700', color: C.textSecondary },
  genderLabelActive: { color: C.primaryDark },

  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginTop: 24 },
  stepperBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0FDF4',
  },
  stepperValueWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 6, minWidth: 140, justifyContent: 'center' },
  stepperValue: { fontSize: 44, fontWeight: '900', color: C.textPrimary },
  stepperInput: {
    fontSize: 44, fontWeight: '900', color: C.textPrimary, minWidth: 90, textAlign: 'right',
    borderBottomWidth: 2, borderBottomColor: C.primary, padding: 0,
  },
  stepperUnit: { fontSize: 16, fontWeight: '700', color: C.textSecondary },

  feedbackCard: {
    marginTop: 28, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.card, padding: 18, alignItems: 'center',
  },
  feedbackText: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  bmiRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  bmiLabel: { fontSize: 13, fontWeight: '700', color: C.textSecondary },
  bmiValue: { fontSize: 18, fontWeight: '900' },

  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  durationChip: {
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
  },
  durationChipActive: { borderColor: C.primary, backgroundColor: C.primary },
  durationChipText: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  durationChipTextActive: { color: '#FFF' },

  customDurationRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  customDurationInput: {
    borderWidth: 1.5, borderColor: C.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    fontSize: 18, fontWeight: '800', color: C.textPrimary, width: 90, textAlign: 'center', backgroundColor: C.card,
  },
  customDurationUnit: { fontSize: 15, fontWeight: '700', color: C.textSecondary },

  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12, backgroundColor: C.card,
  },
  activityRowActive: { borderColor: C.primary, backgroundColor: '#F0FDF4' },
  activityEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  activityLabel: { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  activityLabelActive: { color: C.primaryDark },
  activityDesc: { fontSize: 12, color: C.textSecondary, marginTop: 2 },

  footer: { paddingHorizontal: 28, paddingBottom: 24, paddingTop: 8 },
  btn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', backgroundColor: C.primary },
  btnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },

  buildWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  buildPercent: { fontSize: 56, fontWeight: '900', color: C.primaryDark, marginBottom: 20 },
  buildTrack: { width: '100%', height: 10, borderRadius: 5, backgroundColor: '#DCFCE7', overflow: 'hidden', marginBottom: 28 },
  buildFill: { height: '100%', backgroundColor: C.primary, borderRadius: 5 },
  buildTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary, textAlign: 'center', marginBottom: 8 },
  buildSubtitle: { fontSize: 14, color: C.textSecondary, textAlign: 'center' },
  checkCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  doneBtn: { marginTop: 32, width: '100%' },
});
