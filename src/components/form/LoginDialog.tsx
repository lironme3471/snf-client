import { useEffect, useState } from "react";

import { login } from "../../api/auth";
import { ApiResponseError } from "../../api/client";

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
      if (!normalized) {
        setSubmitError("Paste a valid bearer token.");
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
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-slate-800">Log in to NICE</h2>
          <p className="text-xs text-slate-500 mt-1">
            Use your test environment credentials to get a session Bearer token.
          </p>
          <button
            type="button"
            onClick={() => switchMode(mode === "credentials" ? "token" : "credentials")}
            className="mt-3 text-xs text-slate-500 hover:text-slate-700 underline"
          >
            {mode === "credentials"
              ? "Advanced: paste token manually"
              : "Back to credential login"}
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">
              {submitError}
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
            <div>
              <label className="label" htmlFor="login-token">
                Bearer token
              </label>
              <textarea
                id="login-token"
                className="input min-h-24"
                value={tokenInput}
                onChange={(event) => {
                  setTokenInput(event.target.value);
                  setSubmitError(null);
                }}
                placeholder="Paste token with or without Bearer prefix"
                spellCheck={false}
              />
              <p className="text-xs text-slate-500 mt-1">
                Useful for GitHub Pages when credential login is blocked by CORS.
              </p>
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
            disabled={submitting}
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