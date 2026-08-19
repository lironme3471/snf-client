import type { ApiError } from "../types/api";

export const BASE_URL =
  `${import.meta.env.DEV ? "/nice-api" : "https://api-na1.test.niceincontact.com"}/api/store-and-forward/v1`;

export class ApiResponseError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError
  ) {
    super(body.message ?? `HTTP ${status}`);
  }
}

export async function apiFetch<T>(
  path: string,
  token: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (!res.ok) {
    let body: ApiError = { message: `HTTP ${res.status}` };
    try {
      body = await res.json();
    } catch {
      // keep default message if body is not JSON
    }
    throw new ApiResponseError(res.status, body);
  }

  // 204 / empty body
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}
