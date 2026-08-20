import { useState } from "react";

import { LoginDialog } from "../form/LoginDialog";

interface HeaderProps {
  token: string;
  rememberLogin: boolean;
  onLoginToken: (token: string, remember: boolean) => void;
  onLogout: () => void;
}

export function Header({ token, rememberLogin, onLoginToken, onLogout }: HeaderProps) {
  const [loginOpen, setLoginOpen] = useState(false);

  function handleLogin(tokenValue: string, remember: boolean) {
    onLoginToken(tokenValue, remember);
    setLoginOpen(false);
  }

  return (
    <>
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center gap-4 shadow-lg">
        <div className="flex-1">
          <h1 className="text-lg font-semibold tracking-tight">
            SNF Generic API Client
          </h1>
          <p className="text-slate-400 text-xs">Store &amp; Forward · Test environment</p>
        </div>
        <div className="flex items-center gap-3 min-w-0">
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
