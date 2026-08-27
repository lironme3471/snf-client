import { getApiHost, getLoginHost, type ApiEnv } from "../../../src/api/environments.ts";
import type {
  ApiError,
  CreateJobResponse,
  Job,
  JobInteractionsPage,
  LoginResponse,
} from "../../../src/types/api.ts";
import { HttpError } from "./rateLimiter.ts";

function apiBase(env: ApiEnv): string {
  return `${getApiHost(env)}/api/store-and-forward/v1`;
}

async function parseErrorBody(res: Response): Promise<ApiError> {
  try {
    return (await res.json()) as ApiError;
  } catch {
    return { message: `HTTP ${res.status}` };
  }
}

export async function login(env: ApiEnv, email: string, password: string): Promise<string> {
  const res = await fetch(`${getLoginHost(env)}/public/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const text = await res.text();
  const body = text ? (JSON.parse(text) as LoginResponse | ApiError) : undefined;

  if (!res.ok) {
    const message =
      body && typeof body.message === "string" ? body.message : `Login failed with HTTP ${res.status}`;
    throw new HttpError(res.status, message);
  }

  const loginBody = body as LoginResponse;
  const token =
    loginBody.bearerToken ??
    loginBody.token ??
    loginBody.accessToken ??
    loginBody.access_token ??
    loginBody.data?.bearerToken ??
    loginBody.data?.token ??
    loginBody.result?.bearerToken ??
    loginBody.result?.token;

  if (typeof token !== "string" || !token.trim()) {
    throw new Error("Login succeeded, but no bearer token was found in the response.");
  }
  return token.trim().replace(/^Bearer\s+/i, "");
}

export async function createJob(
  env: ApiEnv,
  token: string,
  zip: Buffer
): Promise<CreateJobResponse> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(zip)]), "manifest.zip");

  const res = await fetch(`${apiBase(env)}/interaction-ingestion-jobs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const body = await parseErrorBody(res);
    throw new HttpError(res.status, body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<CreateJobResponse>;
}

export async function getJob(env: ApiEnv, token: string, jobId: string): Promise<Job> {
  const res = await fetch(`${apiBase(env)}/interaction-ingestion-jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await parseErrorBody(res);
    throw new HttpError(res.status, body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<Job>;
}

export async function listJobInteractions(
  env: ApiEnv,
  token: string,
  jobId: string
): Promise<JobInteractionsPage> {
  const res = await fetch(`${apiBase(env)}/interaction-ingestion-jobs/${jobId}/interactions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await parseErrorBody(res);
    throw new HttpError(res.status, body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<JobInteractionsPage>;
}

/** Uploads a media file straight to its presigned URL. No CXone rate limit applies here. */
export async function uploadMedia(
  uploadUrl: string,
  method: string,
  headers: Record<string, string> | undefined,
  data: Buffer
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method,
    headers,
    body: new Uint8Array(data),
  });
  if (!res.ok) {
    throw new HttpError(res.status, `Media upload failed: HTTP ${res.status}`);
  }
}
