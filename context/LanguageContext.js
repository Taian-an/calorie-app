import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import translations, { LANG_KEYS } from '../constants/translations';

const LanguageContext = createContext(null);
const LANG_KEY = '@calorie_app_lang';

// 語言選擇要存起來：以前只放在 state 裡，使用者切成英文、App 一重開又回到中文
export function LanguageProvider({ children }) {
  // 預設英文；使用者選過的語言存在 AsyncStorage，載入後會蓋掉這個預設
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then(saved => { if (LANG_KEYS.includes(saved)) setLangState(saved); })
      .catch(() => {});
  }, []);

  const setLang = useCallback((next) => {
    setLangState(next);
    AsyncStorage.setItem(LANG_KEY, next).catch(() => {});
  }, []);

  const t = translations[lang];
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
