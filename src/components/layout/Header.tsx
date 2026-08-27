import { useState } from "react";

import { LoginDialog } from "../form/LoginDialog";
import type { ApiEnv } from "../../api/environments";

interface HeaderProps {
  token: string;
  rememberLogin: boolean;
  onLoginToken: (token: string, remember: boolean) => void;
  onLogout: () => void;
  env: ApiEnv;
  onEnvChange: (env: ApiEnv) => void;
}

export function Header({
  token,
  rememberLogin,
  onLoginToken,
  onLogout,
  env,
  onEnvChange,
}: HeaderProps) {
  const [loginOpen, setLoginOpen] = useState(false);

  function handleLogin(tokenValue: string, remember: boolean) {
    onLoginToken(tokenValue, remember);
    setLoginOpen(false);
  }

  function handleEnvClick(next: ApiEnv) {
    if (next === env) return;
    if (
      next === "prod" &&
      !window.confirm(
        "Switch to the PRODUCTION environment? API calls will go to real prod data, and you'll be logged out."
      )
    ) {
      return;
    }
    onEnvChange(next);
  }

  return (
    <>
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center gap-4 shadow-lg">
        <div className="flex-1">
          <h1 className="text-lg font-semibold tracking-tight">
            SNF Generic API Client
          </h1>
          <p className="text-slate-400 text-xs">Store &amp; Forward</p>
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center rounded-full border border-slate-600 overflow-hidden text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleEnvClick("test")}
              className={`px-3 py-1.5 transition-colors ${
                env === "test"
                  ? "bg-slate-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Test
            </button>
            <button
              type="button"
              onClick={() => handleEnvClick("prod")}
              className={`px-3 py-1.5 transition-colors ${
                env === "prod"
                  ? "bg-red-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Prod
            </button>
          </div>
          {token ? (
            <>
              <span className="text-green-400 text-xs font-medium">Ready</span>
              <button
                type="button"
                onClick={onLogout}
                className="text-sm border border-slate-600 hover:bg-slate-800 text-slate-100 px-4 py-2 rounded"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded"
            >
              Login
            </button>
          )}
        </div>
      </header>

      {loginOpen && (
        <LoginDialog
          defaultRemember={rememberLogin}
          onLogin={handleLogin}
          onCancel={() => setLoginOpen(false)}
        />
      )}
    </>
  );
}
