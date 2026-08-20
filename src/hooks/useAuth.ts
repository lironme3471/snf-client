import { useState, useCallback } from "react";

const SESSION_KEY = "snf_bearer_token";
const REMEMBER_KEY = "snf_remember_login";

export function useAuth() {
  const [rememberLogin, setRememberLoginState] = useState<boolean>(
    () => localStorage.getItem(REMEMBER_KEY) !== "0"
  );
  const [token, setTokenState] = useState<string>(
    () => localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY) ?? ""
  );

  const setToken = useCallback((value: string, remember = rememberLogin) => {
    if (remember) {
      localStorage.setItem(SESSION_KEY, value);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, value);
      localStorage.removeItem(SESSION_KEY);
    }
    localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
    setRememberLoginState(remember);
    setTokenState(value);
  }, [rememberLogin]);

  const setRememberLogin = useCallback((value: boolean) => {
    localStorage.setItem(REMEMBER_KEY, value ? "1" : "0");
    setRememberLoginState(value);
  }, []);

  const clearToken = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    setTokenState("");
  }, []);

  return { token, setToken, clearToken, rememberLogin, setRememberLogin };
}
