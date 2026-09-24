import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

// 網頁版的 Google 登入是開一個彈出視窗，Google 驗證完把 id_token 放在網址 #hash 導回我們網站，
// 再由彈出視窗把結果「交還」給原本的分頁（WebBrowser.maybeCompleteAuthSession）。
// 但手機瀏覽器（iOS Safari、Android Chrome）常把彈出視窗開成一般的新分頁、或讓它失去跟原分頁的連結，
// 交還就會失敗：新分頁顯示登入頁、token 被丟掉，後端完全沒收到請求——看起來就是「Google 通過了卻沒登入」。
// 這裡在載入時先試著交還；交還不了，就把 token 留下來，讓這個分頁自己完成登入（login.js 取用）。
// token 本身由後端驗簽章和 audience，不會因為改走這條路而變得比較不安全。
let pendingIdToken = null;

if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash.includes('id_token=')) {
  const idToken = new URLSearchParams(window.location.hash.slice(1)).get('id_token');
  const handedBack = WebBrowser.maybeCompleteAuthSession();
  if (idToken && handedBack.type !== 'success') {
    pendingIdToken = idToken;
    // 把 token 從網址列清掉：不留在瀏覽紀錄，也避免重新整理時重複登入
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
} else {
  // 原生 App 或沒帶 token 的一般載入：照原本的方式處理（原生 App 不會用到彈出視窗）
  WebBrowser.maybeCompleteAuthSession();
}

// 只能取一次，取完就清掉
export function takePendingGoogleIdToken() {
  const token = pendingIdToken;
  pendingIdToken = null;
  return token;
}
