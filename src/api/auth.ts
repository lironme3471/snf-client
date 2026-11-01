import { ApiResponseError } from "./client";
import type { ApiError, LoginResponse } from "../types/api";
import { buildLoginUrl } from "./proxy";

export async function login(email: string, password: string): Promise<string> {
  const res = await fetch(buildLoginUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const text = await res.text();
  const body = parseJson<LoginResponse | ApiError>(text);

  if (!res.ok) {
    throw new ApiResponseError(res.status, toApiError(body, res.status, text));
  }

  const token = extractBearerToken(body as LoginResponse);
  if (!token) {
    throw new Error("Login succeeded, but no bearer token was found in the response.");
  }

  return token;
}

function parseJson<T>(text: string): T | undefined {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

function toApiError(body: LoginResponse | ApiError | undefined, status: number, rawText: string): ApiError {
  const b = body as Record<string, unknown> | undefined;
  const detail = [b?.message, b?.error_description, b?.errorMessage, b?.error, b?.error_code]
    .find((v): v is string => typeof v === "string" && v.trim() !== "");
  if (detail) return { ...(body as ApiError), message: `HTTP ${status}: ${detail}` };
  const raw = rawText.trim().slice(0, 300);
  return { message: raw ? `Login failed with HTTP ${status}: ${raw}` : `Login failed with HTTP ${status} (empty response)` };
}

function extractBearerToken(response: LoginResponse | undefined): string | null {
  if (!response) return null;

  const token =
    response.bearerToken ??
    response.token ??
    response.accessToken ??
    response.access_token ??
    response.idToken ??
    response.id_token ??
    response.data?.bearerToken ??
    response.data?.token ??
    response.data?.accessToken ??
    response.data?.access_token ??
    response.result?.bearerToken ??
    response.result?.token ??
    response.result?.accessToken ??
    response.result?.access_token;

  if (typeof token !== "string" || !token.trim()) return null;
  return token.trim().replace(/^Bearer\s+/i, "");
}