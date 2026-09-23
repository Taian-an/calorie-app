import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, TextInput, Platform, useWindowDimensions, ScrollView } from 'react-native';
// 1. 確保引入的是最新版的 CameraView
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import { useUserData, dateKeyOf, MEAL_TYPES } from '../../context/UserDataContext';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;
const MAX_PHOTOS = 5; // 跟後端 multer 的 upload.array('images', 5) 上限一致
// 後端會把照片縮到長邊 1024px 再送 AI，前端先縮到差不多的大小可以少傳好幾 MB，上傳時間從秒級降到零點幾秒
const MAX_UPLOAD_EDGE = 1280;
// 手機拍照/選圖的 JPEG 品質：0.8 的原圖動輒 3~5MB，0.6 肉眼看不出差、檔案小一半，後端反正會再壓一次
const CAPTURE_QUALITY = 0.6;

// 網頁版從相簿選圖時，expo-image-picker 給的是 blob: URL——某些手機瀏覽器（實測 Android Chrome
// 多選時）這個 blob URL 的生命週期不穩定，畫面上會變成縮圖框都在、但圖片內容整個不見。
// 立刻轉成自帶資料的 data: URI 就沒有這個外部參照生命週期的問題，同時保留原 uri 當退路。
async function toDataUri(uri) {
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return uri;
  }
}

// 沒帶 mealType 參數時依當下時段判斷餐次
function defaultMealType() {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return 'breakfast';
  if (h >= 10 && h < 15) return 'lunch';
  if (h >= 15 && h < 21) return 'dinner';
  return 'snacks';
}

export default function DietCamera() {
  const { t } = useLanguage();
  const router = useRouter();
  const { profile, addMeal, getDayTotals } = useUserData();
  const { mealType: mealTypeParam, autoPick, manual } = useLocalSearchParams();
  const mealType = MEAL_TYPES.includes(mealTypeParam) ? mealTypeParam : defaultMealType();

  // 預覽圖上限跟著螢幕寬度走：手機螢幕窄，跟著縮小；平板/桌機螢幕寬，也不要無限放大，抓個上限。
  // 高度直接算成明確的 px 數值、不要靠 CSS aspect-ratio 撐——部分手機瀏覽器的 WebView 對
  // aspect-ratio 支援不完整，圖片一旦讀取失敗還會整個抓不到高度，往上長成一大塊黑色區域
  const { width: screenWidth } = useWindowDimensions();
  const previewMaxWidth = Math.min(screenWidth * 0.9, 480);
  const previewHeight = previewMaxWidth * 0.75; // 4:3

  // --- 狀態控制 ---
  // 同一份食物可以多角度拍/選好幾張照片一起送給 AI 辨識（例如正面+側面+包裝標籤），
  // 不是同時記錄好幾份不同食物——多份食物要分開各自跑一次完整流程
  const [photos, setPhotos] = useState([]);
  const [manualEntry, setManualEntry] = useState(false); // 從首頁「文字輸入」進來：不用照片，純靠文字說明辨識
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [logged, setLogged] = useState(false); // 使用者按下「儲存」後才變 true，辨識完不會自動存進日誌
  // 記下「送出辨識」那一刻的時間戳，存進日誌時用這個當日期依據——AI 辨識 + 使用者確認結果可能花上
  // 好幾分鐘（尤其遇到額度或網路問題重試時），不能讓最後按「儲存」的當下時間決定存在哪一天，
  // 不然接近午夜拍的照片，儲存時可能已經跨到隔天，食物紀錄就會跑錯日期
  const capturedAtRef = useRef(null);

  // 網頁版權限狀態
  const [webPermission, setWebPermission] = useState(false);
  const [webError, setWebError] = useState(null);

  // --- 手機版專用 Hook ---
  // permission 包含 granted 狀態，requestPermission 是觸發彈窗的函式
  const [permission, requestPermission] = useCameraPermissions();

  // --- Refs ---
  const cameraRef = useRef(null); // 手機相機
  const videoRef = useRef(null);   // 網頁影片
  const canvasRef = useRef(null);   // 網頁截圖
  const streamRef = useRef(null);  // 網頁鏡頭串流（video 元素還沒掛載前先暫存）

  // --- 網頁版請求鏡頭（抽成函式，讓「重試」按鈕能直接呼叫） ---
  // 部分手機瀏覽器（尤其 iOS Safari）不允許在頁面載入時自動呼叫 getUserMedia，
  // 一定要在使用者點擊當下同步觸發才會跳出授權，否則會被靜默拒絕
  const requestWebCamera = () => {
    // navigator.mediaDevices 只在安全環境 (HTTPS 或 localhost) 才存在，
    // 用一般區網 IP 的 http:// 開啟時它會是 undefined，直接呼叫會拋出例外把整個頁面弄空白
    if (!navigator.mediaDevices?.getUserMedia) {
      setWebError('此瀏覽器連線不安全 (非 HTTPS)，無法使用相機，請改用 HTTPS 網址開啟');
      setWebPermission(false);
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        // 這個當下 <video> 標籤還沒渲染出來（畫面還停在「未授權」分支），
        // videoRef.current 一定是 null，所以先把 stream 存起來，
        // 等下面的 effect 偵測到 webPermission 變 true、video 掛載後再接上去
        streamRef.current = stream;
        setWebError(null);
        setWebPermission(true);
      })
      .catch((err) => {
        console.error("網頁相機請求失敗:", err);
        setWebError('無法取得相機權限，請確認瀏覽器已允許存取鏡頭，或點下方按鈕重試');
        setWebPermission(false);
      });
  };

  // --- 每次「進入」這個畫面都重新開始一輪，不是只在第一次掛載時初始化一次 ---
  // camera 是 Tabs.Screen（href:null），Tabs 導覽預設不會 unmount 沒在看的分頁，
  // 所以第二次從首頁點「拍照辨識」進來時，這支元件其實是同一個實例，舊的 photos/result/logged
  // 都還留著、mount-only 的 useEffect 也不會再跑一次——不重置的話就會看起來「只能用一次」。
  // autoPick 進來的話使用者根本不打算用鏡頭，跳過鏡頭權限請求，直接開相簿。
  useFocusEffect(
    useCallback(() => {
      setPhotos([]);
      setResult(null);
      setLogged(false);
      setDescription('');
      const isManual = manual === '1';
      setManualEntry(isManual);
      if (isManual) {
        // 文字輸入模式：不用照片，不用碰相機/相簿
      } else if (autoPick === '1') {
        pickFromGallery();
      } else if (Platform.OS === 'web') {
        requestWebCamera();
      }
      // 手機版不需要在這裡主動 request 相機權限，因為 Expo 規範由使用者點擊或初次渲染狀態判定
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoPick, manual])
  );

  // --- <video> 元素在權限通過後才會掛載，這裡負責把暫存的 stream 接上去 ---
  // 依賴要包含 photos.length：拍照後 photos 有值，<video> 會因為條件渲染被整個卸載，
  // 按「重拍」讓 photos 變回空陣列時 <video> 是全新掛載的節點，
  // 不會自動帶著舊的 srcObject，只看 webPermission 的話這個 effect 不會再跑，
  // 畫面就會停在黑屏而不是馬上接回鏡頭畫面
  useEffect(() => {
    if (Platform.OS === 'web' && !photos.length && webPermission && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [webPermission, photos.length]);

  // --- 檢查目前是否有權限 ---
  const hasCameraPermission = Platform.OS === 'web' ? webPermission : permission?.granted;

  // --- 從相簿選擇圖片（可一次多選，同一份食物的多角度照片會疊加進現有的 photos，不是取代） ---
  const pickFromGallery = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError('需要相簿權限才能選擇圖片');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: CAPTURE_QUALITY,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS,
    });
    if (!result.canceled && result.assets?.length) {
      let uris = result.assets.map(a => a.uri);
      if (Platform.OS === 'web') uris = await Promise.all(uris.map(toDataUri));
      if (photos.length + uris.length > MAX_PHOTOS) showError(`最多只能選 ${MAX_PHOTOS} 張照片，多的已省略`);
      setPhotos(prev => [...prev, ...uris].slice(0, MAX_PHOTOS));
    }
  };

  // --- 如果還沒取得相機權限且尚未選圖，顯示請求介面（仍可改從相簿選圖） ---
  if (!hasCameraPermission && !photos.length && !manualEntry) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{webError ?? '需要相機權限才能拍照辨識食物卡路里'}</Text>
        {Platform.OS !== 'web' ? (
          <TouchableOpacity style={[styles.btn, styles.confirmBtn]} onPress={requestPermission}>
            <Text style={styles.btnText}>授予相機權限</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.confirmBtn]} onPress={requestWebCamera}>
            <Text style={styles.btnText}>📷 開啟相機</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.btn, styles.cancelBtn, { marginTop: 12 }]} onPress={pickFromGallery}>
          <Text style={styles.btnText}>改從相簿選擇圖片</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- 拍照按鈕動作（拍到的這張加進 photos，不是取代——離開即時鏡頭畫面後還能從相簿再補幾張角度） ---
  const takePicture = async () => {
    if (Platform.OS === 'web') {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        // 直接照鏡頭解析度存的話 4K 鏡頭一張就好幾 MB，先等比例縮到 MAX_UPLOAD_EDGE
        const scale = Math.min(1, MAX_UPLOAD_EDGE / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setPhotos(prev => [...prev, canvas.toDataURL('image/jpeg', 0.8)].slice(0, MAX_PHOTOS));
      }
    } else {
      // 手機版拍照：注意最新版 Expo 參數格式
      if (cameraRef.current) {
        try {
          const options = { quality: CAPTURE_QUALITY };
          const data = await cameraRef.current.takePictureAsync(options);
          if (data && data.uri) {
            setPhotos(prev => [...prev, data.uri].slice(0, MAX_PHOTOS));
          }
        } catch (err) {
          showError("手機拍照失敗: " + err.message);
        }
      }
    }
  };

  // --- 上傳分析 ---
  const uploadAndAnalyze = async () => {
    if (manualEntry) {
      if (!description.trim()) { showError('請先輸入食物描述'); return; }
    } else if (!photos.length) {
      return;
    }
    setLoading(true);
    setResult(null);
    capturedAtRef.current = Date.now();

    const formData = new FormData();

    // 文字輸入模式沒有照片可傳，FormData 只帶 description，後端本來就支援「只有文字、沒有圖片」的請求；
    // 有照片的話全部用同一個欄位名 'images' 附加上去，後端 multer 用 upload.array 一次收下來，
    // 當成「同一份食物」的多角度照片合併辨識，不是好幾份不同食物
    for (let i = 0; i < photos.length; i++) {
      const uri = photos[i];
      if (Platform.OS === 'web') {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          formData.append('images', blob, `food-capture-${i}.jpg`);
        } catch (err) {
          showError("圖片轉換失敗");
          setLoading(false);
          return;
        }
      } else {
        // 手機版 FormData 格式
        formData.append('images', {
          uri,
          name: `food-capture-${i}.jpg`,
          type: 'image/jpeg',
        });
      }
    }

    if (description.trim()) {
      formData.append('description', description.trim());
    }

    try {
      // 後端會在同一個 request 裡等辨識做完（一般 3~4 秒），做完就直接回 status:'done' + 結果；
      // 只有佇列塞車等不到時才回 202 + analysisId，這時再改用 pollAnalysis 輪詢
      const { data } = await axios.post(`${API_BASE}/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 20000, // 上傳 + 後端最多等 8 秒辨識，網路慢的時候上傳本身也要幾秒
      });
      if (data.status === 'done') {
        setResult(data);
        setLoading(false);
        return;
      }
      await pollAnalysis(data.analysisId);
    } catch (error) {
      console.error(error);
      if (error.code === 'ECONNABORTED') {
        showError('連線逾時，請確認網路連線後再試一次');
      } else if (!error.response) {
        showError('無法連線到伺服器，請確認網路連線或伺服器位址設定');
      } else {
        showError(error.response?.data?.error ?? 'AI 分析失敗，請重試');
      }
      setLoading(false);
    }
  };

  // 每 0.5 秒問一次後端這筆辨識做完了沒，最多等 30 秒（會走到輪詢代表後端已經塞車，
  // 30 秒還沒好基本上就是卡住了，讓使用者知道並可以重試，不要無限等下去）。
  // 間隔從 1.2 秒縮到 0.5 秒：結果出來到前端拿到的空等時間最多 0.5 秒，查詢本身很輕量
  const pollAnalysis = async (analysisId) => {
    const POLL_MS = 500;
    const MAX_WAIT_MS = 30000;
    const startedAt = Date.now();

    while (Date.now() - startedAt < MAX_WAIT_MS) {
      const { data } = await axios.get(`${API_BASE}/analyses/${analysisId}`);
      if (data.status === 'done') {
        setResult(data);
        setLoading(false);
        return;
      }
      if (data.status === 'failed') {
        showError(data.error ?? 'AI 分析失敗，請重試');
        setLoading(false);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, POLL_MS));
    }

    showError('分析時間過長，請稍後再試一次');
    setLoading(false);
  };

  // --- 使用者確認後才真的存進日誌，辨識完不會自動存 ---
  const confirmLog = () => {
    if (!result) return;
    addMeal({
      name:      result.name,
      energy:    result.energy,
      protein:   result.protein,
      carbs:     result.carbs,
      fat:       result.fat,
      grams:     result.grams,
      fiber:     result.fiber,
      sugar:     result.sugar,
      sodium:    result.sodium,
      potassium: result.potassium,
      calcium:   result.calcium,
      iron:      result.iron,
      vitaminC:  result.vitaminC,
      vitaminA:  result.vitaminA,
      mealType,
    }, capturedAtRef.current);
    setLogged(true);
  };

  const showError = (message) => {
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      const { Alert } = require('react-native');
      Alert.alert("提示", message);
    }
  };

  return (
    <View style={styles.container}>
      {(!photos.length && !manualEntry) ? (
        Platform.OS === 'web' ? (
          <View style={styles.cameraBox}>
            <video ref={videoRef} autoPlay playsInline style={styles.webVideo} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <View style={styles.controlRow}>
              <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
                <Text style={styles.galleryButtonText}>相簿</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shutterButton} onPress={takePicture}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>
              <View style={styles.galleryButtonSpacer} />
            </View>
          </View>
        ) : (
          // 手機版：使用 CameraView，並確保 ref 正確繫結
          <CameraView style={styles.cameraBox} ref={cameraRef} facing="back">
            <View style={styles.controlRow}>
              <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
                <Text style={styles.galleryButtonText}>相簿</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shutterButton} onPress={takePicture}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>
              <View style={styles.galleryButtonSpacer} />
            </View>
          </CameraView>
        )
      ) : (
        <View style={styles.previewBox}>
          {photos.length ? (
            <Image
              source={{ uri: photos[0] }}
              style={[styles.previewImage, { width: previewMaxWidth, height: previewHeight }]}
              resizeMode="cover"
            />
          ) : (
            // 文字輸入模式沒有照片，這裡放一個筆記本圖示占住原本照片的位置，維持跟拍照流程一致的版面
            <View style={[styles.previewImage, styles.manualIconBox, { width: previewMaxWidth, height: previewHeight }]}>
              <Text style={styles.manualIcon}>📝</Text>
            </View>
          )}

          {/* 同一份食物的多角度照片：縮圖列，可個別刪除、可再從相簿補選（上限 MAX_PHOTOS 張） */}
          {!manualEntry && !result && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow} contentContainerStyle={styles.thumbRowContent}>
              {photos.map((uri, i) => (
                <View key={uri + i} style={styles.thumbWrap}>
                  <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.thumbRemove}
                    onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                    disabled={loading}
                  >
                    <Text style={styles.thumbRemoveText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < MAX_PHOTOS && (
                <TouchableOpacity style={styles.thumbAdd} onPress={pickFromGallery} disabled={loading}>
                  <Text style={styles.thumbAddText}>＋</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
          {!manualEntry && photos.length > 1 && !result && (
            <Text style={styles.multiPhotoHint}>{t.multiPhotoHint.replace('{n}', photos.length)}</Text>
          )}

          {!result && (
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder={manualEntry ? t.manualDescriptionPlaceholder : t.foodDescriptionPlaceholder}
              placeholderTextColor="#888"
              editable={!loading}
              autoFocus={manualEntry}
            />
          )}

          {result && (() => {
            // 用「送出辨識」那一刻的日期，不是現在——這樣才會跟實際存檔的日期一致，
            // 不會在快接近午夜時，這裡顯示今天的剩餘熱量，結果卻存進了隔天
            const targetDateKey = dateKeyOf(new Date(capturedAtRef.current ?? Date.now()));
            const todayTotals = getDayTotals(targetDateKey) ?? { energy: 0 };
            const target = profile?.target ?? profile?.tdee;
            const remaining = target != null ? Math.round(target - todayTotals.energy) : null;
            return (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>🍽️ {result.name}{result.grams ? `（約 ${result.grams}g）` : ''}</Text>
                <Text style={styles.resultText}>📒 {logged ? t.loggedToMeal : t.willLogToMeal}: {t[mealType]}</Text>
                <Text style={styles.resultText}>🔥 熱量: {result.energy} kcal</Text>
                <Text style={styles.resultText}>💪 蛋: {result.protein}g | 🍞 碳: {result.carbs}g | 🥑 脂: {result.fat}g</Text>
                {result.items?.length > 1 && (
                  // AI 拆解的組成明細（白飯 180g · 234 kcal…），讓使用者看得出總熱量怎麼來、哪一項估錯了好在描述裡補充重跑
                  <View style={styles.itemList}>
                    {result.items.map((item, i) => (
                      <Text key={i} style={styles.itemText}>· {item.name} {item.grams}g — {item.calories} kcal</Text>
                    ))}
                  </View>
                )}
                {remaining != null && (
                  <Text style={styles.remainingText}>
                    {remaining >= 0
                      ? `今天還可以吃 ${remaining} kcal`
                      : `今天已超出目標 ${Math.abs(remaining)} kcal`}
                  </Text>
                )}
                {logged && <Text style={styles.savedText}>✅ {t.savedLog}</Text>}
              </View>
            );
          })()}

          <View style={styles.buttonGroup}>
            {logged ? (
              <TouchableOpacity style={[styles.btn, styles.confirmBtn]} onPress={() => router.back()}>
                <Text style={styles.btnText}>{t.doneLabel}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={() => {
                    if (manualEntry && !result) { router.back(); return; } // 文字輸入沒有「重拍」這件事，取消就直接離開
                    setPhotos([]); setResult(null); setDescription('');
                  }}
                  disabled={loading}
                >
                  <Text style={styles.btnText}>{result ? t.cancelLog : (manualEntry ? '取消' : '重拍')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.confirmBtn]}
                  onPress={result ? confirmLog : uploadAndAnalyze}
                  disabled={loading}
                >
                  <Text style={styles.btnText}>{loading ? "分析中..." : (result ? t.saveLog : "確認分析")}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  cameraBox: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  webVideo: { width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 30, marginBottom: 40, zIndex: 10 },
  shutterButton: { width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  galleryButton: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  galleryButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  galleryButtonSpacer: { width: 54, height: 54 },
  previewBox: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 },
  previewImage: { borderRadius: 12, backgroundColor: '#1E1E1E' },
  manualIconBox: { backgroundColor: '#1E1E1E', justifyContent: 'center', alignItems: 'center' },
  manualIcon: { fontSize: 64 },
  descriptionInput: {
    width: '100%', marginTop: 16, backgroundColor: '#1E1E1E', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16, color: '#fff', fontSize: 15,
  },
  thumbRow: { width: '100%', marginTop: 12 },
  thumbRowContent: { gap: 10, paddingRight: 4 },
  thumbWrap: { width: 56, height: 56 },
  thumbImage: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#1E1E1E' },
  thumbRemove: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#121212',
  },
  thumbRemoveText: { color: '#fff', fontSize: 12, fontWeight: '900', lineHeight: 14 },
  thumbAdd: {
    width: 56, height: 56, borderRadius: 8, borderWidth: 1.5, borderColor: '#444',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
  thumbAddText: { color: '#00E676', fontSize: 22, fontWeight: '700' },
  multiPhotoHint: { color: '#00E676', fontSize: 12, marginTop: 8 },
  buttonGroup: { flexDirection: 'row', marginTop: 20, gap: 20 },
  btn: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, minWidth: 120, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#444' },
  confirmBtn: { backgroundColor: '#00E676' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: '#fff', textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
  resultCard: { backgroundColor: '#1E1E1E', padding: 15, borderRadius: 12, marginTop: 20, width: '100%' },
  resultTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  resultText: { color: '#aaa', fontSize: 14 },
  itemList: { marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#333' },
  itemText: { color: '#888', fontSize: 13, lineHeight: 20 },
  remainingText: { color: '#00E676', fontSize: 14, fontWeight: 'bold', marginTop: 8 },
  savedText: { color: '#00E676', fontSize: 15, fontWeight: 'bold', marginTop: 10, textAlign: 'center' },
});
