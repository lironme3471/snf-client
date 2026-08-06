import { useState, useCallback } from "react";

const SESSION_KEY = "snf_bearer_token";

export function useAuth() {
  const [token, setTokenState] = useState<string>(
    () => sessionStorage.getItem(SESSION_KEY) ?? ""
  );

  const setToken = useCallback((value: string) => {
    sessionStorage.setItem(SESSION_KEY, value);
    setTokenState(value);
  }, []);

  const clearToken = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setTokenState("");
  }, []);

  return { token, setToken, clearToken };
}
