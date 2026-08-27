export type ApiEnv = "test" | "prod";

const STORAGE_KEY = "snf_api_env";
const DEFAULT_ENV: ApiEnv = "test";

const HOSTS: Record<ApiEnv, { apiHost: string; loginHost: string }> = {
  test: {
    apiHost: "https://api-na1.test.niceincontact.com",
    loginHost: "https://na1.test.nice-incontact.com",
  },
  prod: {
    apiHost: "https://api-na1.niceincontact.com",
    loginHost: "https://na1.nice-incontact.com",
  },
};

function isApiEnv(value: string | null): value is ApiEnv {
  return value === "test" || value === "prod";
}

export function getCurrentEnv(): ApiEnv {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isApiEnv(stored) ? stored : DEFAULT_ENV;
}

export function setCurrentEnv(env: ApiEnv): void {
  localStorage.setItem(STORAGE_KEY, env);
}

export function getApiHost(env: ApiEnv = getCurrentEnv()): string {
  return HOSTS[env].apiHost;
}

export function getLoginHost(env: ApiEnv = getCurrentEnv()): string {
  return HOSTS[env].loginHost;
}
