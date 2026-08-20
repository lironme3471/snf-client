import { ApiResponseError } from "./client";
import type { ApiError, LoginResponse } from "../types/api";
import { buildLoginUrl } from "./proxy";

const LOGIN_URL = buildLoginUrl();

export async function login(email: string, password: string): Promise<string> {
  const res = await fetch(LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const text = await res.text();
  const body = parseJson<LoginResponse | ApiError>(text);

  if (!res.ok) {
    throw new ApiResponseError(res.status, toApiError(body, res.status));
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

function toApiError(body: LoginResponse | ApiError | undefined, status: number): ApiError {
  if (body && typeof body.message === "string") {
    return body as ApiError;
  }
  return { message: `Login failed with HTTP ${status}` };
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