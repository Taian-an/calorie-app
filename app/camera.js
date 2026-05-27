import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useRef } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet,
  Alert, SafeAreaView, ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { useLanguage } from './_LanguageContext';

const C = {
  primary:       '#22C55E',
  primaryDark:   '#16A34A',
  bg:            '#F0FDF4',
  card:          '#FFFFFF',
  textPrimary:   '#14532D',
  textSecondary: '#6B7280',
};

// 請在此填入你的 Hugging Face token（不要上傳到 GitHub）
// Get your free token at: https://huggingface.co/settings/tokens
const HF_TOKEN = process.env.EXPO_PUBLIC_HF_TOKEN || 'YOUR_HF_TOKEN_HERE';

function NutriItem({ label, value, unit, color }) {
  return (
    <View style={s.nutriItem}>
      <Text style={[s.nutriValue, { color }]}>
        {typeof value === 'number' ? value.toFixed(1) : value}
      </Text>
      <Text style={s.nutriUnit}>{unit}</Text>
      <Text style={s.nutriLabel}>{label}</Text>
    </View>
  );
}

export default function CameraScreen() {
  const { t } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const cameraRef = useRef(null);

  if (!permission) return <View style={s.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={s.permContainer}>
        <Text style={s.permEmoji}>📷</Text>
        <Text style={s.permTitle}>{t.permTitle}</Text>
        <Text style={s.permSub}>{t.permSub}</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={s.permBtnText}>{t.permBtn}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef.current || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false });

      const formData = new FormData();
      formData.append('file', { uri: photo.uri, type: 'image/jpeg', name: 'photo.jpg' });
      const hfRes = await axios.post(
        'https://api-inference.huggingface.co/models/nateraw/food',
        formData,
        { headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'multipart/form-data' } }
      );

      const top = hfRes.data[0];
      if (!top) throw new Error('no result');

      const usdaRes = await axios.get('https://api.nal.usda.gov/fdc/v1/foods/search', {
        params: { query: top.label, api_key: 'DEMO_KEY', pageSize: 1 },
      });
      const food = usdaRes.data.foods?.[0];
      if (!food) throw new Error('no food data');

      const get = name => food.foodNutrients.find(n => n.nutrientName === name)?.value ?? 0;
      setResult({
        name:       top.label,
        confidence: Math.round(top.score * 100),
        energy:     get('Energy'),
        protein:    get('Protein'),
        carbs:      get('Carbohydrate, by difference'),
        fat:        get('Total lipid (fat)'),
      });
    } catch {
      Alert.alert(t.failTitle, t.failMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <CameraView style={s.camera} ref={cameraRef} facing="back">
        <View style={s.overlay}>
          <View style={s.hintPill}>
            <Text style={s.hintText}>{t.cameraHint}</Text>
          </View>
          <View style={s.frameBox}>
            <View style={[s.corner, s.cornerTL]} />
            <View style={[s.corner, s.cornerTR]} />
            <View style={[s.corner, s.cornerBL]} />
            <View style={[s.corner, s.cornerBR]} />
          </View>
          <Text style={s.poweredBy}>Powered by Hugging Face × USDA FoodData</Text>
        </View>
      </CameraView>

      {/* Shutter */}
      <View style={s.shutterBar}>
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.loadingText}>{t.recognizing}</Text>
          </View>
        ) : (
          <TouchableOpacity style={s.shutterBtn} onPress={takePhoto} activeOpacity={0.8}>
            <View style={s.shutterRing}>
              <View style={s.shutterDot} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Result Card */}
      {result && (
        <View style={s.resultCard}>
          <View style={s.resultHeader}>
            <View>
              <Text style={s.resultName}>{result.name}</Text>
              <Text style={s.resultPer}>{t.per100g}</Text>
            </View>
            <View style={s.confBadge}>
              <Text style={s.confText}>✓ {result.confidence}% {t.confidence}</Text>
            </View>
          </View>
          <View style={s.nutriRow}>
            <NutriItem label={t.energy}       value={result.energy}  unit="kcal" color="#EF4444" />
            <NutriItem label={t.proteinShort} value={result.protein} unit="g"    color="#3B82F6" />
            <NutriItem label={t.carbsShort}   value={result.carbs}   unit="g"    color="#F97316" />
            <NutriItem label={t.fatShort}     value={result.fat}     unit="g"    color="#8B5CF6" />
          </View>
        </View>
      )}
    </View>
  );
}

const CORNER = 22, THICK = 3;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera:    { flex: 1 },

  overlay:  { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 40 },
  hintPill: { backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 18, paddingVertical: 7, borderRadius: 24 },
  hintText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  frameBox:  { width: 250, height: 250, position: 'relative' },
  corner:    { position: 'absolute', width: CORNER, height: CORNER, borderColor: C.primary },
  cornerTL:  { top: 0, left: 0,    borderTopWidth: THICK,    borderLeftWidth: THICK,   borderTopLeftRadius: 6 },
  cornerTR:  { top: 0, right: 0,   borderTopWidth: THICK,    borderRightWidth: THICK,  borderTopRightRadius: 6 },
  cornerBL:  { bottom: 0, left: 0,  borderBottomWidth: THICK, borderLeftWidth: THICK,   borderBottomLeftRadius: 6 },
  cornerBR:  { bottom: 0, right: 0, borderBottomWidth: THICK, borderRightWidth: THICK,  borderBottomRightRadius: 6 },
  poweredBy: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600' },

  shutterBar:  { backgroundColor: '#111', paddingVertical: 28, alignItems: 'center' },
  shutterRing: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: C.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.1)' },
  shutterDot:  { width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary },
  loadingWrap: { alignItems: 'center' },
  loadingText: { color: '#FFF', marginTop: 10, fontSize: 14, fontWeight: '700' },

  resultCard: {
    backgroundColor: C.card, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12,
  },
  resultHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  resultName:    { fontSize: 18, fontWeight: '900', color: C.textPrimary, textTransform: 'capitalize' },
  resultPer:     { fontSize: 11, color: C.textSecondary, marginTop: 3 },
  confBadge:     { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  confText:      { color: C.primaryDark, fontSize: 12, fontWeight: '800' },

  nutriRow:   { flexDirection: 'row', justifyContent: 'space-around' },
  nutriItem:  { alignItems: 'center' },
  nutriValue: { fontSize: 22, fontWeight: '900' },
  nutriUnit:  { fontSize: 11, color: C.textSecondary, fontWeight: '700', marginTop: 2 },
  nutriLabel: { fontSize: 11, color: C.textSecondary, marginTop: 3 },

  permContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, padding: 40 },
  permEmoji:     { fontSize: 56, marginBottom: 16 },
  permTitle:     { fontSize: 22, fontWeight: '900', color: C.textPrimary, marginBottom: 8 },
  permSub:       { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  permBtn:       { backgroundColor: C.primary, paddingHorizontal: 36, paddingVertical: 15, borderRadius: 14 },
  permBtnText:   { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
