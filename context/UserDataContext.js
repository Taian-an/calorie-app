import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = '@calorie_app_user_data';
const AUTH_KEY    = '@calorie_app_auth';
const API_BASE    = process.env.EXPO_PUBLIC_API_URL;

const UserDataContext = createContext(null);

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];

// 舊資料的 meal 沒有 mealType 欄位，一律當作點心，不做資料遷移
function normalizeMealType(type) {
  return MEAL_TYPES.includes(type) ? type : 'snacks';
}

export function dateKeyOf(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function dateKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return dateKeyOf(d);
}

export const MICRO_KEYS = ['fiber', 'sugar', 'sodium', 'potassium', 'calcium', 'iron', 'vitaminC', 'vitaminA'];

function sumMeals(meals) {
  return meals.reduce(
    (acc, m) => {
      acc.energy  += m.energy  || 0;
      acc.protein += m.protein || 0;
      acc.carbs   += m.carbs   || 0;
      acc.fat     += m.fat     || 0;
      for (const k of MICRO_KEYS) acc[k] += m[k] || 0;
      return acc;
    },
    { energy: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, potassium: 0, calcium: 0, iron: 0, vitaminC: 0, vitaminA: 0 }
  );
}

export function UserDataProvider({ children }) {
  const [profile, setProfile] = useState(null); // { age, gender, height, weight, activity, bmr, tdee }
  const [dailyLogs, setDailyLogs] = useState({}); // { 'YYYY-MM-DD': { weight, tdee, meals: [...] } }
  const [loaded, setLoaded] = useState(false);
  const [authEmail, setAuthEmail] = useState(null);
  const tokenRef = useRef(null); // 用 ref 讓同步函式永遠拿到最新 token

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(AUTH_KEY)]).then(([raw, rawAuth]) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setProfile(parsed.profile ?? null);
          setDailyLogs(parsed.dailyLogs ?? {});
        } catch {
          // 損毀的資料就當作沒有，不阻擋 App 啟動
        }
      }
      if (rawAuth) {
        try {
          const { token, email } = JSON.parse(rawAuth);
          tokenRef.current = token;
          setAuthEmail(email);
        } catch { /* ignore */ }
      }
      setLoaded(true);
    });
  }, []);

  const persist = useCallback((nextProfile, nextDailyLogs) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: nextProfile, dailyLogs: nextDailyLogs }));
  }, []);

  /* ===== 雲端同步（登入後才生效，失敗不影響本地操作）===== */
  const authHeaders = () => ({ Authorization: `Bearer ${tokenRef.current}` });

  // 推一天的日誌上雲（fire-and-forget）
  const syncDayUp = useCallback((date, dayLog) => {
    if (!tokenRef.current || !dayLog) return;
    axios.put(`${API_BASE}/logs/${date}`, dayLog, { headers: authHeaders() })
      .catch(err => console.warn('[sync] day failed:', err.message));
  }, []);

  const syncProfileUp = useCallback((nextProfile) => {
    if (!tokenRef.current || !nextProfile) return;
    axios.put(`${API_BASE}/me`, nextProfile, { headers: authHeaders() })
      .catch(err => console.warn('[sync] profile failed:', err.message));
  }, []);

  const saveAuth = async (token, email) => {
    tokenRef.current = token;
    setAuthEmail(email);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ token, email }));
  };

  // 註冊：全新開戶，不帶任何本地殘留資料（登入是強制關卡，不會有「登入前先離線用」這種情境，
  // 裝置上如果還留著上一個帳號登出前的 profile/dailyLogs，絕對不能被新帳號繼承走）
  // name 是選填的（register 頁的 First + Last Name 拼起來）；沒填的話後端會直接拿 username 當顯示名稱
  const register = useCallback(async (email, username, password, name) => {
    const { data } = await axios.post(`${API_BASE}/auth/register`, { email, username, password, profile: name ? { name } : undefined });

    const { email: _e, ...serverProfile } = data.profile ?? {};
    setProfile(serverProfile);
    persist(serverProfile, {});
    await saveAuth(data.token, data.profile.email);
  }, [persist]);

  // 登入成功後共用的收尾：完全以雲端資料為準。不把裝置上殘留的本地 profile/dailyLogs 往上推——
  // 登入是強制關卡，本地不可能有「這個帳號自己的、雲端還沒有」的合法資料，殘留的本地快取只可能是
  // 上一個在這台裝置登出的帳號留下的，絕對不能被推到現在這個帳號的雲端紀錄裡
  const applyAuthResult = useCallback(async (data) => {
    tokenRef.current = data.token;
    const { data: serverLogs } = await axios.get(`${API_BASE}/logs`, { headers: authHeaders() });

    const { email: _e, ...serverProfile } = data.profile ?? {};
    setProfile(serverProfile);
    setDailyLogs(serverLogs);
    persist(serverProfile, serverLogs);
    await saveAuth(data.token, data.profile.email);
  }, [persist]);

  // 登入：email + password
  const login = useCallback(async (email, password) => {
    const { data } = await axios.post(`${API_BASE}/auth/login`, { email, password });
    await applyAuthResult(data);
  }, [applyAuthResult]);

  // Google 登入／註冊二合一：idToken 交給後端驗證，帳號不存在就直接建立
  const loginWithGoogle = useCallback(async (idToken) => {
    const { data } = await axios.post(`${API_BASE}/auth/google`, { idToken });
    await applyAuthResult(data);
  }, [applyAuthResult]);

  // 主動向後端要最新 profile（後台/資料庫端改過名字等資料時，登入頁面用這個刷新，不用等使用者登出重登）
  const refreshProfile = useCallback(async () => {
    if (!tokenRef.current) return;
    const { data } = await axios.get(`${API_BASE}/me`, { headers: authHeaders() });
    const { email: _e, ...serverProfile } = data ?? {};
    const nextProfile = { ...(profile ?? {}), ...serverProfile };
    setProfile(nextProfile);
    persist(nextProfile, dailyLogs);
  }, [profile, dailyLogs, persist]);

  // 登出：清 token，也清掉本地 profile/dailyLogs 快取——不然下一個在這台裝置登入/註冊的帳號會整個繼承走
  const logout = useCallback(async () => {
    tokenRef.current = null;
    setAuthEmail(null);
    setProfile(null);
    setDailyLogs({});
    await Promise.all([
      AsyncStorage.removeItem(AUTH_KEY),
      AsyncStorage.removeItem(STORAGE_KEY),
    ]);
  }, []);

  // 刪除帳號：後端把帳號、日誌、辨識歷史全部刪掉後，本地也照登出流程清乾淨。
  // 後端失敗就直接往外丟、不清本地資料，讓畫面顯示錯誤、使用者可以重試
  const deleteAccount = useCallback(async () => {
    await axios.delete(`${API_BASE}/me`, { headers: authHeaders(), timeout: 15000 });
    await logout();
  }, [logout]);

  // 更新使用者身體數據 / TDEE 目標，並把當天的體重、目標熱量記錄下來
  const updateProfile = useCallback((newProfile) => {
    setDailyLogs(prevLogs => {
      const today = dateKey();
      const nextLogs = {
        ...prevLogs,
        [today]: {
          ...(prevLogs[today] ?? { meals: [] }),
          weight: newProfile.weight,
          tdee: newProfile.tdee,
        },
      };
      persist(newProfile, nextLogs);
      syncDayUp(today, nextLogs[today]);
      return nextLogs;
    });
    setProfile(newProfile);
    syncProfileUp(newProfile);
  }, [persist, syncDayUp, syncProfileUp]);

  // 拍照分析完的一餐記進日誌。atTimestamp 預設是「現在」，但呼叫端可以帶「送出辨識當下」的時間戳，
  // 這樣即使 AI 辨識/使用者確認花了好幾分鐘、甚至跨過午夜，記錄的日期還是跟著拍照那一刻走，不會跳到隔天
  const addMeal = useCallback((meal, atTimestamp) => {
    const at = atTimestamp ?? Date.now();
    setDailyLogs(prevLogs => {
      const today = dateKeyOf(new Date(at));
      const existing = prevLogs[today] ?? { meals: [] };
      const nextLogs = {
        ...prevLogs,
        [today]: {
          ...existing,
          meals: [...existing.meals, { ...meal, mealType: normalizeMealType(meal.mealType), time: at }],
        },
      };
      persist(profile, nextLogs);
      syncDayUp(today, nextLogs[today]);
      return nextLogs;
    });
  }, [persist, profile, syncDayUp]);

  // 刪除某一天的一筆食物紀錄（用 time 當唯一識別）
  const removeMeal = useCallback((key, time) => {
    setDailyLogs(prevLogs => {
      const log = prevLogs[key];
      if (!log?.meals?.length) return prevLogs;
      const nextLogs = { ...prevLogs, [key]: { ...log, meals: log.meals.filter(m => m.time !== time) } };
      persist(profile, nextLogs);
      syncDayUp(key, nextLogs[key]);
      return nextLogs;
    });
  }, [persist, profile, syncDayUp]);

  // 取得某一天依餐次分組的食物紀錄，永遠回傳四個餐次的完整結構
  const getMealsByType = useCallback((key) => {
    const grouped = { breakfast: [], lunch: [], dinner: [], snacks: [] };
    for (const m of dailyLogs[key]?.meals ?? []) {
      grouped[normalizeMealType(m.mealType)].push(m);
    }
    return grouped;
  }, [dailyLogs]);

  // 取得某一天的三大營養素 + 熱量總和；沒有紀錄回傳 null
  const getDayTotals = useCallback((key) => {
    const log = dailyLogs[key];
    if (!log || !log.meals?.length) return null;
    return sumMeals(log.meals);
  }, [dailyLogs]);

  const getDayLog = useCallback((key) => dailyLogs[key] ?? null, [dailyLogs]);

  // AI 教練對話：messages 是 [{ role: 'user' | 'model', text }, ...]，整段本地陣列送給後端當上下文，
  // 對話紀錄只存在裝置上（不落地存 DB），回傳這次 AI 的回覆文字
  const sendCoachMessage = useCallback(async (messages) => {
    const { data } = await axios.post(`${API_BASE}/coach/chat`, { messages }, { headers: authHeaders() });
    return data.reply;
  }, []);

  const value = {
    profile,
    dailyLogs,
    loaded,
    updateProfile,
    addMeal,
    removeMeal,
    getDayTotals,
    getDayLog,
    getMealsByType,
    authEmail,
    register,
    login,
    loginWithGoogle,
    refreshProfile,
    logout,
    deleteAccount,
    sendCoachMessage,
  };

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserData() {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error('useUserData must be used within UserDataProvider');
  return ctx;
}
