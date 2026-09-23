// 登入 / 註冊 / Google 登入失敗時，畫面上要顯示的訊息。
// 後端的錯誤文字不直接給使用者看：有的寫死英文、有的寫死中文（例如「Google 驗證失敗」），
// 切到另一種語言就會混在一起。這裡依 HTTP 狀態碼和已知的後端訊息，換成目前語言的翻譯。
// fallbackKey：沒對到已知情況時用哪一句（Google 登入用 googleFailed，其他用 authFailed）
export function authErrorMessage(err, t, fallbackKey = 'authFailed') {
  if (!err?.response) return t.authNetwork; // 連不上伺服器、逾時
  const { status, data } = err.response;
  const serverError = data?.error;
  if (status === 429) return t.authTooMany;
  if (serverError === 'Wrong email or password') return t.authWrongCredentials;
  if (serverError === 'Email already registered') return t.authEmailTaken;
  if (serverError === 'Username already taken') return t.authUsernameTaken;
  if (status === 400 && serverError?.startsWith('Invalid email, username or password')) return t.authInvalidInput;
  return t[fallbackKey];
}
