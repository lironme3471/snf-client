import { useEffect, useState } from "react";

import { login } from "../../api/auth";
import { ApiResponseError } from "../../api/client";
import { formatTimeLeft, getTokenExpiry } from "../../api/token";

const DEFAULT_EMAIL = "meiralvtest@nice.com";

interface LoginDialogProps {
  defaultRemember?: boolean;
  onLogin: (token: string, remember: boolean) => void;
  onCancel: () => void;
}

interface LoginFields {
  email: string;
  password: string;
}

type LoginMode = "credentials" | "token";

export function LoginDialog({ defaultRemember = true, onLogin, onCancel }: LoginDialogProps) {
  const [mode, setMode] = useState<LoginMode>("credentials");
  const [fields, setFields] = useState<LoginFields>({
    email: DEFAULT_EMAIL,
    password: "",
  });
  const [tokenInput, setTokenInput] = useState("");
  const [rememberLogin, setRememberLogin] = useState(defaultRemember);
  const [errors, setErrors] = useState<Partial<LoginFields>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canReadClipboard =
    typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function";
  const tokenCheck = mode === "token" ? checkToken(tokenInput) : null;

  async function pasteFromClipboard() {
    try {
      setTokenInput(await navigator.clipboard.readText());
      setSubmitError(null);
    } catch {
      setSubmitError("Couldn't read the clipboard. Paste into the box with Ctrl/Cmd + V.");
    }
  }

  useEffect(() => {
    const focusId = mode === "credentials" ? "login-password" : "login-token";
    document.getElementById(focusId)?.focus();
  }, [mode]);

  function validate(): boolean {
    const nextErrors: Partial<LoginFields> = {};
    if (!fields.email.trim()) nextErrors.email = "Required";
    if (!fields.password) nextErrors.password = "Required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "token") {
      const normalized = normalizeToken(tokenInput);
      if (!normalized || tokenCheck?.ok === false) {
        setSubmitError(tokenCheck?.message ?? "Paste a valid bearer token.");
        return;
      }
      onLogin(normalized, rememberLogin);
      return;
    }

    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = await login(fields.email.trim(), fields.password);
      onLogin(token, rememberLogin);
    } catch (err) {
      if (err instanceof ApiResponseError) {
        setSubmitError(err.body.message ?? `Login failed with HTTP ${err.status}`);
      } else {
        setSubmitError(
          err instanceof Error && err.message === "Failed to fetch"
            ? "Network/CORS error from hosted mode. Use the Paste Token option, or run locally."
            : err instanceof Error
            ? err.message
            : "Login failed"
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  function set(field: keyof LoginFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(null);
  }

  function switchMode(next: LoginMode) {
    setMode(next);
    setSubmitError(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
      >
        <div className="px-6 pt-4 pb-3 border-b">
          <h2 className="font-semibold text-slate-800">Log in to NICE</h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === "credentials"
              ? "Use your test environment credentials to get a session Bearer token."
              : "Accounts with MFA can't log in with a password here. Paste a token from your browser session instead."}
          </p>
          <div
            role="tablist"
            className="mt-3 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium"
          >
            {(
              [
                ["credentials", "Email & password"],
                ["token", "Paste token (MFA)"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => switchMode(value)}
                className={`rounded-md py-1.5 transition-colors ${
                  mode === value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">
              {submitError}
              {mode === "credentials" && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => switchMode("token")}
                    className="underline font-medium"
                  >
                    Account uses MFA? Paste a token instead.
                  </button>
                </>
              )}
            </div>
          )}

          {mode === "credentials" ? (
            <>
              <div>
                <label className="label" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="input"
                  value={fields.email}
                  onChange={(event) => set("email", event.target.value)}
                  autoComplete="username"
                />
                {errors.email && <p className="err">{errors.email}</p>}
              </div>

              <div>
                <label className="label" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  className="input"
                  value={fields.password}
                  onChange={(event) => set("password", event.target.value)}
                  autoComplete="current-password"
                />
                {errors.password && <p className="err">{errors.password}</p>}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
                <li>Log in to NICE in another tab (including your MFA code).</li>
                <li>
                  Open DevTools (<kbd className="kbd">F12</kbd> or{" "}
                  <kbd className="kbd">⌘</kbd>
                  <kbd className="kbd">⌥</kbd>
                  <kbd className="kbd">I</kbd>) → <b>Network</b>, reload, filter by{" "}
                  <code>api</code>.
                </li>
                <li>
                  Click a request → <b>Request Headers</b> → copy the value of{" "}
                  <code>authorization</code>.
                </li>
              </ol>

              <div>
                <div className="flex items-center justify-between">
                  <label className="label" htmlFor="login-token">
                    Bearer token
                  </label>
                  {canReadClipboard && (
                    <button
                      type="button"
                      onClick={pasteFromClipboard}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Paste from clipboard
                    </button>
                  )}
                </div>
                <textarea
                  id="login-token"
                  className="input min-h-20 font-mono text-xs break-all"
                  value={tokenInput}
                  onChange={(event) => {
                    setTokenInput(event.target.value);
                    setSubmitError(null);
                  }}
                  placeholder="Paste token with or without Bearer prefix"
                  spellCheck={false}
                />
                {tokenCheck && (
                  <p className={`text-xs mt-1 ${tokenCheck.ok ? "text-green-600" : "text-red-600"}`}>
                    {tokenCheck.message}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Treat the token like a password. Use the same environment (Test / Staging /
                  Prod) that is selected in the header.
                </p>
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={rememberLogin}
              onChange={(event) => setRememberLogin(event.target.checked)}
            />
            Remember me on this browser
          </label>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium px-4 py-2 rounded"
            disabled={submitting || (mode === "token" && !tokenCheck?.ok)}
          >
            {mode === "token" ? "Use token" : submitting ? "Logging in..." : "Login"}
          </button>
        </div>
      </form>
    </div>
  );
}

function normalizeToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/^Bearer\s+/i, "");
}

function checkToken(value: string): { ok: boolean; message: string } | null {
  const token = normalizeToken(value);
  if (!token) return null;
  if (/\s/.test(token)) {
    return { ok: false, message: "That contains spaces or line breaks. Copy only the token." };
  }
  const expiry = getTokenExpiry(token);
  if (expiry === null) {
    return token.split(".").length === 3
      ? { ok: true, message: "Token accepted." }
      : { ok: false, message: "This doesn't look like a bearer token (expected three dot-separated parts)." };
  }
  const left = expiry - Date.now();
  return left > 0
    ? { ok: true, message: `Token looks valid – expires in ${formatTimeLeft(left)}.` }
    : { ok: false, message: "This token has already expired. Copy a fresh one." };
}
