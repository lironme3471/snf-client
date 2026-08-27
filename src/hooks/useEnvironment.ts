import { useCallback, useState } from "react";

import { getCurrentEnv, setCurrentEnv, type ApiEnv } from "../api/environments";

export function useEnvironment() {
  const [env, setEnvState] = useState<ApiEnv>(getCurrentEnv);

  const setEnv = useCallback((value: ApiEnv) => {
    setCurrentEnv(value);
    setEnvState(value);
  }, []);

  return { env, setEnv };
}
