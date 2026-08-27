import { getCurrentEnv, getLoginHost } from "./environments";

const RAW_PROXY_BASE = import.meta.env.VITE_PROXY_BASE?.trim() ?? "";

export const PROXY_BASE = RAW_PROXY_BASE
  ? RAW_PROXY_BASE.replace(/\/+$/, "")
  : "";

export const HAS_PROXY = PROXY_BASE.length > 0;

export function buildLoginUrl(): string {
  const env = getCurrentEnv();
  if (import.meta.env.DEV) return `/login-api/${env}/public/user/login`;
  if (HAS_PROXY) return `${PROXY_BASE}/login?env=${env}`;
  return `${getLoginHost(env)}/public/user/login`;
}

export function isS3LikeUrl(uploadUrl: string): boolean {
  try {
    const host = new URL(uploadUrl).host.toLowerCase();
    return host.includes(".s3.") || host.endsWith("amazonaws.com");
  } catch {
    return false;
  }
}

export function buildUploadProxyUrl(
  uploadUrl: string,
  method: string,
  headers?: Record<string, string>
): string {
  const url = new URL(`${PROXY_BASE}/upload`);
  url.searchParams.set("url", uploadUrl);
  url.searchParams.set("method", method);
  if (headers && Object.keys(headers).length > 0) {
    url.searchParams.set("headers", encodeBase64(JSON.stringify(headers)));
  }
  return url.toString();
}

function encodeBase64(value: string): string {
  return btoa(value);
}