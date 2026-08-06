import { useState } from "react";

interface HeaderProps {
  token: string;
  onTokenChange: (t: string) => void;
}

export function Header({ token, onTokenChange }: HeaderProps) {
  const [visible, setVisible] = useState(false);

  return (
    <header className="bg-slate-900 text-white px-6 py-4 flex items-center gap-4 shadow-lg">
      <div className="flex-1">
        <h1 className="text-lg font-semibold tracking-tight">
          SNF Generic API Client
        </h1>
        <p className="text-slate-400 text-xs">Store &amp; Forward · Test environment</p>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <label className="text-slate-300 text-sm whitespace-nowrap">Bearer token</label>
        <div className="relative">
          <input
            type={visible ? "text" : "password"}
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
            placeholder="Paste your token…"
            className="bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm w-72 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            aria-label={visible ? "Hide token" : "Show token"}
          >
            {visible ? "Hide" : "Show"}
          </button>
        </div>
        {token && (
          <span className="text-green-400 text-xs font-medium">● Ready</span>
        )}
      </div>
    </header>
  );
}
