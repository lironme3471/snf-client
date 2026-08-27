import { useState, useEffect } from "react";
import type { InteractionStatusView } from "../../types/api";
import { listJobInteractions } from "../../api/jobs";

const STATUS_COLORS: Record<string, string> = {
  PROCESSING: "bg-slate-100 text-slate-700",
  WAITING_FOR_MEDIA_UPLOAD: "bg-yellow-100 text-yellow-800",
  SUCCEEDED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

interface Props {
  token: string;
  jobId: string;
  isJobRunning: boolean;
}

export function InteractionsList({ token, jobId, isJobRunning }: Props) {
  const [interactions, setInteractions] = useState<InteractionStatusView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const page = await listJobInteractions(token, jobId);
      setInteractions(page.interactions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load interactions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [jobId]);

  // auto-refresh while job is still running
  useEffect(() => {
    if (!isJobRunning) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [isJobRunning, jobId]);

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
        <h3 className="font-semibold text-slate-800">
          Interactions ({interactions.length})
        </h3>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="text-xs text-blue-600 hover:underline disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {interactions.length === 0 && !loading && !error && (
        <p className="px-4 py-6 text-sm text-slate-400 text-center">No interactions found.</p>
      )}

      {interactions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {["Interaction ID", "System", "Status", "Error", "Media"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium text-slate-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {interactions.map((ix) => (
                <tr key={ix.interactionId} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs">{ix.interactionId}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">{ix.systemName}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ix.status] ?? "bg-slate-100"}`}
                    >
                      {ix.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {ix.errorCode && (
                      <span className="text-red-600 font-medium">{ix.errorCode}</span>
                    )}
                    {ix.errorMessage && (
                      <span className="ml-1 text-slate-500">{ix.errorMessage}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {ix.mediaUploadedCount != null && ix.mediaExpectedCount != null
                      ? `${ix.mediaUploadedCount}/${ix.mediaExpectedCount}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
