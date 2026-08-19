import { useEffect, useState } from "react";

import { login } from "../../api/auth";
import { ApiResponseError } from "../../api/client";

const DEFAULT_EMAIL = "meiralvtest@nice.com";

interface LoginDialogProps {
  onLogin: (token: string) => void;
  onCancel: () => void;
}

interface LoginFields {
  email: string;
  password: string;
}

export function LoginDialog({ onLogin, onCancel }: LoginDialogProps) {
  const [fields, setFields] = useState<LoginFields>({
    email: DEFAULT_EMAIL,
    password: "",
  });
  const [errors, setErrors] = useState<Partial<LoginFields>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.getElementById("login-password")?.focus();
  }, []);

  function validate(): boolean {
    const nextErrors: Partial<LoginFields> = {};
    if (!fields.email.trim()) nextErrors.email = "Required";
    if (!fields.password) nextErrors.password = "Required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = await login(fields.email.trim(), fields.password);
      onLogin(token);
    } catch (err) {
      if (err instanceof ApiResponseError) {
        setSubmitError(err.body.message ?? `Login failed with HTTP ${err.status}`);
      } else {
        setSubmitError(err instanceof Error ? err.message : "Login failed");
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
        </div>

        <div className="px-6 py-5 space-y-4">
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">
              {submitError}
            </div>
          )}

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
            {submitting ? "Logging in..." : "Login"}
          </button>
        </div>
      </form>
    </div>
  );
}