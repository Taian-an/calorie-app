import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, TextInput, Image, ScrollView,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import { useUserData, dateKeyOf, MEAL_TYPES } from '../../context/UserDataContext';

// 包裝食品營養資料來自 Open Food Facts（公開、免費、不需要金鑰），App 直接查，不經過我們的後端
const OFF_URL = 'https://world.openfoodfacts.org/api/v2/product';
const OFF_FIELDS = 'code,product_name,brands,nutriments,serving_quantity,image_front_small_url';
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'];

function defaultMealType() {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return 'breakfast';
  if (h >= 10 && h < 15) return 'lunch';
  if (h >= 15 && h < 21) return 'dinner';
  return 'snacks';
}

const num = v => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

// Open Food Facts 的營養數字都是「每 100g」；沒有 kcal 時退回用 kJ 換算（1 kcal = 4.184 kJ）
function parseProduct(code, raw) {
  const n = raw.nutriments ?? {};
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy-kj_100g']) != null ? num(n['energy-kj_100g']) / 4.184 : null);
  if (kcal == null || kcal <= 0) return { error: 'noNutrition' };
  const brand = (raw.brands ?? '').split(',')[0].trim();
  return {
    product: {
      code,
      name: (raw.product_name ?? '').trim() || `#${code}`,
      brand: brand || null,
      image: raw.image_front_small_url ?? null,
      servingGrams: num(raw.serving_quantity),
      per100: {
        kcal,
        protein: num(n.proteins_100g) ?? 0,
        carbs: num(n.carbohydrates_100g) ?? 0,
        fat: num(n.fat_100g) ?? 0,
      },
    },
  };
}

// 回傳 { product } 或 { error: 'invalid' | 'notFound' | 'noNutrition' | 'rateLimited' | 'network' }
async function lookupBarcode(input) {
  const code = String(input).replace(/\D/g, '');
  if (![8, 12, 13, 14].includes(code.length)) return { error: 'invalid' };
  try {
    const headers = Platform.OS === 'web' ? undefined : { 'User-Agent': 'CalorieTracker-App/1.0 (student project)' };
    const res = await fetch(`${OFF_URL}/${code}.json?fields=${OFF_FIELDS}`, { headers });
    if (res.status === 429) return { error: 'rateLimited' };
    // 查不到的條碼 OFF 也是回 404 + JSON body（{"status":0}）
    if (res.status !== 200 && res.status !== 404) return { error: 'network' };
    const json = await res.json();
    if (json.status !== 1 || !json.product) return { error: 'notFound' };
    return parseProduct(code, json.product);
  } catch {
    return { error: 'network' };
  }
}

const round1 = v => Math.round(v * 10) / 10;

export default function BarcodeScan() {
  const { t } = useLanguage();
  const router = useRouter();
  const { profile, addMeal, getDayTotals } = useUserData();
  const { mealType: mealTypeParam } = useLocalSearchParams();
  const mealType = MEAL_TYPES.includes(mealTypeParam) ? mealTypeParam : defaultMealType();

  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState(null);
  const [product, setProduct] = useState(null);
  const [grams, setGrams] = useState('100');
  const [logged, setLogged] = useState(false);
  // 掃描到的那一刻當作記錄時間，跟拍照辨識一致：使用者調份量花的時間不會讓紀錄跨到隔天
  const scannedAtRef = useRef(null);
  const busyRef = useRef(false); // 相機每秒會連續回報同一個條碼很多次，只處理第一次

  // barcode 是 Tabs.Screen，不會在離開時 unmount，每次進入都要重置
  useFocusEffect(
    useCallback(() => {
      setManualCode('');
      setLoading(false);
      setErrorKey(null);
      setProduct(null);
      setLogged(false);
      busyRef.current = false;
    }, [])
  );

  const search = async code => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    setErrorKey(null);
    const result = await lookupBarcode(code);
    setLoading(false);
    if (result.error) {
      setErrorKey(result.error);
      busyRef.current = false; // 失敗可以再掃/再輸入
      return;
    }
    scannedAtRef.current = Date.now();
    setProduct(result.product);
    setGrams(String(Math.round(result.product.servingGrams ?? 100)));
  };

  const rescan = () => {
    setProduct(null);
    setLogged(false);
    setErrorKey(null);
    setManualCode('');
    busyRef.current = false;
  };

  const gramsNum = Math.max(0, parseFloat(grams) || 0);
  const factor = gramsNum / 100;
  const totals = product && {
    energy: Math.round(product.per100.kcal * factor),
    protein: round1(product.per100.protein * factor),
    carbs: round1(product.per100.carbs * factor),
    fat: round1(product.per100.fat * factor),
  };

  const confirmLog = () => {
    if (!product || gramsNum <= 0) return;
    addMeal({
      name: product.brand ? `${product.name} (${product.brand})` : product.name,
      energy: totals.energy,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      grams: Math.round(gramsNum),
      mealType,
    }, scannedAtRef.current);
    setLogged(true);
  };

  const errorText = errorKey && ({
    invalid: t.barcodeInvalid,
    notFound: t.barcodeNotFound,
    noNutrition: t.barcodeNoNutrition,
    rateLimited: t.barcodeRateLimited,
    network: t.barcodeNetwork,
  }[errorKey]);

  // ---------- 商品結果 ----------
  if (product) {
    const dateKey = dateKeyOf(new Date(scannedAtRef.current ?? Date.now()));
    const eaten = getDayTotals(dateKey)?.energy ?? 0;
    const target = profile?.target ?? profile?.tdee;
    const remaining = target != null ? Math.round(target - eaten - (logged ? 0 : totals.energy)) : null;
    return (
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.flex} contentContainerStyle={s.resultContent} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            <View style={s.productRow}>
              {product.image ? <Image source={{ uri: product.image }} style={s.productImage} /> : <View style={[s.productImage, s.imagePlaceholder]}><Text style={{ fontSize: 28 }}>📦</Text></View>}
              <View style={s.flex}>
                <Text style={s.productName}>{product.name}</Text>
                {product.brand && <Text style={s.productBrand}>{product.brand}</Text>}
                <Text style={s.per100}>{t.barcodePer100}: {Math.round(product.per100.kcal)} kcal</Text>
              </View>
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.label}>{t.barcodePortion}</Text>
            <View style={s.gramsRow}>
              <TextInput
                style={s.gramsInput}
                value={grams}
                onChangeText={v => setGrams(v.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                editable={!logged}
                selectTextOnFocus
              />
              <Text style={s.gramsUnit}>g</Text>
              {product.servingGrams != null && !logged && (
                <TouchableOpacity style={s.chip} onPress={() => setGrams(String(Math.round(product.servingGrams)))}>
                  <Text style={s.chipText}>{t.barcodeOneServing} ({Math.round(product.servingGrams)}g)</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.totalKcal}>{totals.energy} kcal</Text>
            <Text style={s.macros}>
              {t.camMacroLine.replace('{p}', totals.protein).replace('{c}', totals.carbs).replace('{f}', totals.fat)}
            </Text>
            <Text style={s.mealLine}>📒 {logged ? t.loggedToMeal : t.willLogToMeal}: {t[mealType]}</Text>
            {remaining != null && (
              <Text style={s.remaining}>
                {remaining >= 0 ? t.camRemaining.replace('{n}', remaining) : t.camOver.replace('{n}', Math.abs(remaining))}
              </Text>
            )}
            {logged && <Text style={s.saved}>✅ {t.savedLog}</Text>}
          </View>

          <View style={s.btnRow}>
            {logged ? (
              <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={() => router.back()}>
                <Text style={s.btnText}>{t.doneLabel}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={rescan}>
                  <Text style={[s.btnText, s.btnGhostText]}>{t.barcodeRescan}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, s.btnPrimary, gramsNum <= 0 && s.btnDisabled]} onPress={confirmLog} disabled={gramsNum <= 0}>
                  <Text style={s.btnText}>{t.barcodeSave}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          <Text style={s.credit}>{t.barcodeCredit}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ---------- 掃描 / 手動輸入 ----------
  const canScan = permission?.granted;
  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.scanContainer}>
        <View style={s.cameraWrap}>
          {canScan ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
              onBarcodeScanned={loading ? undefined : ({ data }) => search(data)}
            />
          ) : (
            <View style={s.permissionBox}>
              <Text style={s.permissionText}>{permission && !permission.canAskAgain ? t.camNeedPermission : t.barcodeNeedCamera}</Text>
              {permission?.canAskAgain !== false && (
                <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={requestPermission}>
                  <Text style={s.btnText}>{t.camGrantPermission}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {canScan && <View pointerEvents="none" style={s.reticle} />}
          {loading && (
            <View style={s.loadingOverlay}>
              <ActivityIndicator color="#fff" />
              <Text style={s.loadingText}>{t.barcodeSearching}</Text>
            </View>
          )}
        </View>

        <View style={s.manualBox}>
          <Text style={s.hint}>{t.barcodeHint}</Text>
          {errorText && <Text style={s.error}>{errorText}</Text>}
          <View style={s.manualRow}>
            <TextInput
              style={s.manualInput}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder={t.barcodeManualPlaceholder}
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              returnKeyType="search"
              onSubmitEditing={() => search(manualCode)}
            />
            <TouchableOpacity style={[s.btn, s.btnPrimary, s.lookupBtn, !manualCode.trim() && s.btnDisabled]} onPress={() => search(manualCode)} disabled={!manualCode.trim() || loading}>
              <Text style={s.btnText}>{t.barcodeLookUp}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={s.cancelLink}>
            <Text style={s.cancelText}>{t.camCancel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const G = '#22C55E';
const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F0FDF4' },
  scanContainer: { flex: 1, backgroundColor: '#121212' },
  cameraWrap: { flex: 1, backgroundColor: '#000', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  reticle: { width: '72%', height: 130, borderWidth: 3, borderColor: '#00E676', borderRadius: 16, opacity: 0.85 },
  permissionBox: { padding: 24, alignItems: 'center', gap: 16 },
  permissionText: { color: '#fff', textAlign: 'center', fontSize: 15 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  manualBox: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  hint: { color: '#6B7280', fontSize: 13, textAlign: 'center', marginBottom: 10 },
  error: { color: '#DC2626', fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 10 },
  manualRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  manualInput: { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, fontSize: 16, color: '#14532D' },
  lookupBtn: { minWidth: 0, paddingHorizontal: 20 },
  cancelLink: { alignSelf: 'center', paddingVertical: 12 },
  cancelText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },

  resultContent: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  productRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  productImage: { width: 78, height: 78, borderRadius: 12, backgroundColor: '#F3F4F6' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 17, fontWeight: '800', color: '#14532D' },
  productBrand: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  per100: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  label: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 8 },
  gramsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  gramsInput: { minWidth: 90, borderWidth: 1.5, borderColor: G, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, fontSize: 20, fontWeight: '800', color: '#14532D', textAlign: 'center' },
  gramsUnit: { fontSize: 16, fontWeight: '700', color: '#6B7280' },
  chip: { backgroundColor: '#DCFCE7', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  chipText: { color: '#15803D', fontSize: 12, fontWeight: '700' },
  totalKcal: { fontSize: 32, fontWeight: '900', color: '#14532D' },
  macros: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  mealLine: { fontSize: 14, color: '#6B7280', marginTop: 10 },
  remaining: { fontSize: 14, fontWeight: '700', color: G, marginTop: 6 },
  saved: { fontSize: 15, fontWeight: '800', color: G, marginTop: 10 },
  btnRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  btn: { paddingVertical: 13, paddingHorizontal: 26, borderRadius: 25, minWidth: 120, alignItems: 'center' },
  btnPrimary: { backgroundColor: G },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: G },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  btnGhostText: { color: '#15803D' },
  credit: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
});
