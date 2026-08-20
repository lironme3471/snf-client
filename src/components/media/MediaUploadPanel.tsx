import { useState, useRef, useEffect } from "react";
import type { MediaUploadUrl } from "../../types/api";
import {
  buildUploadProxyUrl,
  HAS_PROXY,
  isS3LikeUrl,
} from "../../api/proxy";

interface UploadState {
  status: "idle" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const ms = Date.parse(expiresAt) - Date.now();
  if (ms <= 0) return <span className="text-red-500 text-xs">Expired</span>;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return (
    <span className="text-slate-500 text-xs">
      Expires in {mins}m {secs}s
    </span>
  );
}

function MediaUploadRow({ url, autoBlob }: { url: MediaUploadUrl; autoBlob?: Blob }) {
  const [state, setState] = useState<UploadState>({ status: "idle", progress: 0 });
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  // auto-upload sample blob immediately when provided
  useEffect(() => {
    if (autoBlob) handleBlob(autoBlob);
  }, []);

  async function handleBlob(blob: Blob) {
    setCopyState("idle");
    setState({ status: "uploading", progress: 0 });
    try {
      await uploadWithProgress(blob, url, (p) =>
        setState((s) => ({ ...s, progress: p }))
      );
      setState({ status: "done", progress: 100 });
    } catch (err) {
      setState({
        status: "error",
        progress: 0,
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  async function copyCurlCommand() {
    const command = buildCurlUploadCommand(url);
    try {
      await navigator.clipboard.writeText(command);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className="border rounded p-3 space-y-2 bg-slate-50">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="font-medium">{url.mediaType}</span>
        {url.mediaId && <span className="text-slate-500">ID: {url.mediaId}</span>}
        {url.interactionId && (
          <span className="text-slate-500">Interaction: {url.interactionId}</span>
        )}
        {url.maxSizeBytes && (
          <span className="text-slate-500">
            Max: {(url.maxSizeBytes / 1048576).toFixed(0)} MB
          </span>
        )}
        {url.uploadUrlExpiresAt && (
          <ExpiryCountdown expiresAt={url.uploadUrlExpiresAt} />
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleBlob(f);
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (state.status === "error" && autoBlob) {
              handleBlob(autoBlob);
              return;
            }
            inputRef.current?.click();
          }}
          disabled={state.status === "uploading" || state.status === "done"}
          className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded"
        >
          {state.status === "done"
            ? "Uploaded ✓"
            : state.status === "error" && autoBlob
            ? "Retry sample upload"
            : autoBlob
            ? "Auto-uploading sample…"
            : "Choose file & upload"}
        </button>

        <button
          type="button"
          onClick={copyCurlCommand}
          className="text-xs border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded"
          title="Copy a curl command for manual upload"
        >
          Copy curl
        </button>

        {copyState === "copied" && (
          <span className="text-emerald-600 text-xs">Copied curl command</span>
        )}
        {copyState === "failed" && (
          <span className="text-red-500 text-xs">Copy failed</span>
        )}

        {state.status === "uploading" && (
          <div className="flex-1 bg-slate-200 rounded h-2">
            <div
              className="bg-blue-500 h-2 rounded transition-all"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        )}

        {state.status === "error" && (
          <span className="text-red-500 text-xs">{state.error}</span>
        )}
      </div>
    </div>
  );
}

async function uploadWithProgress(
  file: Blob,
  url: MediaUploadUrl,
  onProgress: (pct: number) => void
): Promise<void> {
  // Rewrite S3 URLs to use local proxy to avoid CORS issues in development
  let uploadUrl = url.uploadUrl;
  let requestHeaders: Record<string, string> = { ...(url.headers ?? {}) };

  if (import.meta.env.DEV && isS3LikeUrl(uploadUrl)) {
    const s3Url = new URL(uploadUrl);
    uploadUrl = `/s3-proxy${s3Url.pathname}${s3Url.search}`;
  }

  if (!import.meta.env.DEV && HAS_PROXY && isS3LikeUrl(uploadUrl)) {
    uploadUrl = buildUploadProxyUrl(uploadUrl, url.httpMethod, requestHeaders);
    requestHeaders = {};
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await uploadAttempt(file, url.httpMethod, uploadUrl, requestHeaders, onProgress);
      return;
    } catch (err) {
      const status = err instanceof UploadError ? err.status : undefined;
      if (attempt === 2 || !status || status < 500) throw err;
    }
  }
}

class UploadError extends Error {
  constructor(public readonly status: number) {
    super(`Upload failed: HTTP ${status}`);
  }
}

function uploadAttempt(
  file: Blob,
  method: string,
  uploadUrl: string,
  headers: Record<string, string>,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      if (xhr.status === 0) {
        reject(new Error(describeUploadNetworkError(uploadUrl)));
        return;
      }
      reject(new UploadError(xhr.status));
    });
    xhr.addEventListener("error", () => reject(new Error(describeUploadNetworkError(uploadUrl))));
    xhr.open(method, uploadUrl);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.send(file);
  });
}

function describeUploadNetworkError(uploadUrl: string): string {
  if (!import.meta.env.DEV && isS3LikeUrl(uploadUrl)) {
    if (!HAS_PROXY) {
      return "Media upload blocked by CORS in hosted mode. Configure VITE_PROXY_BASE or use localhost.";
    }
    return "Upload through proxy failed. Check proxy logs and retry.";
  }
  return "Network error";
}

function buildCurlUploadCommand(url: MediaUploadUrl): string {
  const headerLines = Object.entries(url.headers ?? {})
    .map(([key, value]) => `  -H ${shellQuote(`${key}: ${value}`)} \\\n`)
    .join("");

  return (
    `curl -X ${url.httpMethod} ${shellQuote(url.uploadUrl)} \\\n` +
    headerLines +
    `  --upload-file '/absolute/path/to/file'`
  );
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

interface Props {
  uploadUrls: MediaUploadUrl[];
  blobMap?: Map<string, Blob>;
}

export function MediaUploadPanel({ uploadUrls, blobMap }: Props) {
  if (uploadUrls.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50">
        <h3 className="font-semibold text-slate-800">
          Media uploads ({uploadUrls.length})
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {blobMap && blobMap.size > 0
            ? "Sample media files are uploading automatically."
            : "Upload each media file to its presigned URL before it expires."}
        </p>
      </div>
      <div className="p-4 space-y-3">
        {uploadUrls.map((u, i) => (
          <MediaUploadRow
            key={u.mediaId ?? i}
            url={u}
            autoBlob={u.mediaId ? blobMap?.get(u.mediaId) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
