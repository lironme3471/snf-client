import { useState, useEffect } from "react";
import { SAMPLE_AGENT_CONFIG } from "../../utils/mockData";

export interface AgentConfig {
  systemName: string;
  identifierType: string;
  identifierValue: string;
}

const STORAGE_KEY = "snf_mock_agent_config";

function loadSaved(): AgentConfig {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return { systemName: "", identifierType: "", identifierValue: "" };
  }
}

interface Props {
  onConfirm: (config: AgentConfig) => void;
  onCancel: () => void;
}

export function MockConfigDialog({ onConfirm, onCancel }: Props) {
  const [config, setConfig] = useState<AgentConfig>(() => {
    const saved = loadSaved();
    return {
      systemName: saved.systemName || SAMPLE_AGENT_CONFIG.systemName,
      identifierType: saved.identifierType || SAMPLE_AGENT_CONFIG.identifierType,
      identifierValue: saved.identifierValue || SAMPLE_AGENT_CONFIG.identifierValue,
    };
  });

  const [errors, setErrors] = useState<Partial<AgentConfig>>({});

  // trap focus inside dialog on mount
  useEffect(() => {
    const firstInput = document.getElementById("mock-system-name");
    firstInput?.focus();
  }, []);

  function validate(): boolean {
    const e: Partial<AgentConfig> = {};
    if (!config.systemName.trim()) e.systemName = "Required";
    if (!config.identifierType.trim()) e.identifierType = "Required";
    if (!config.identifierValue.trim()) e.identifierValue = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleConfirm() {
    if (!validate()) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    onConfirm(config);
  }

  function set(field: keyof AgentConfig, value: string) {
    setConfig((c) => ({ ...c, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-slate-800">Configure agent for mock</h2>
          <p className="text-xs text-slate-500 mt-1">
            These values must match a pre-configured agent in your CXone instance.
            They are saved locally so you only need to fill them in once.
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="label" htmlFor="mock-system-name">
              System name
            </label>
            <input
              id="mock-system-name"
              className="input"
              placeholder="e.g. AcmeRecordingSystem"
              value={config.systemName}
              onChange={(e) => set("systemName", e.target.value)}
            />
            {errors.systemName && <p className="err">{errors.systemName}</p>}
            <p className="text-xs text-slate-400 mt-0.5">
              The source system name pre-defined in CXone
            </p>
          </div>

          <div>
            <label className="label" htmlFor="mock-id-type">
              Identifier type
            </label>
            <input
              id="mock-id-type"
              className="input"
              placeholder="e.g. EMAIL"
              value={config.identifierType}
              onChange={(e) => set("identifierType", e.target.value)}
            />
            {errors.identifierType && <p className="err">{errors.identifierType}</p>}
          </div>

          <div>
            <label className="label" htmlFor="mock-id-value">
              Identifier value
            </label>
            <input
              id="mock-id-value"
              className="input"
              placeholder="e.g. agent@company.com"
              value={config.identifierValue}
              onChange={(e) => set("identifierValue", e.target.value)}
            />
            {errors.identifierValue && <p className="err">{errors.identifierValue}</p>}
            <p className="text-xs text-slate-400 mt-0.5">
              Used as both the participant identifier and external identifier value
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded"
          >
            Generate mock
          </button>
        </div>
      </div>
    </div>
  );
}
