import { useState } from "react";
import type { JobRecord } from "../../store/jobHistory";
import { getJob } from "../../api/jobs";

const STATUS_COLORS: Record<string, string> = {
  RUNNING: "bg-blue-100 text-blue-800",
  SUCCEEDED: "bg-green-100 text-green-800",
  PARTIALLY_SUCCEEDED: "bg-yellow-100 text-yellow-800",
  FAILED: "bg-red-100 text-red-800",
};

const TERMINAL_STATUSES = new Set(["SUCCEEDED", "PARTIALLY_SUCCEEDED", "FAILED"]);

interface Props {
  jobs: JobRecord[];
  token: string;
  onSelectJob: (jobId: string) => void;
  onUpdateJob: (jobId: string, patch: Partial<JobRecord>) => void;
  onClearAll: () => void;
}

export function JobDashboard({ jobs, token, onSelectJob, onUpdateJob, onClearAll }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  async function refreshAll() {
    const running = jobs.filter((j) => !TERMINAL_STATUSES.has(j.status));
    if (running.length === 0) return;
    setRefreshing(true);
    for (const job of running) {
      try {
        const updated = await getJob(token, job.jobId);
        onUpdateJob(job.jobId, {
          status: updated.status,
          interactionCounters: updated.interactionCounters ?? job.interactionCounters,
        });
      } catch {
        // silently skip failed refreshes
      }
    }
    setRefreshing(false);
  }

  const runningCount = jobs.filter((j) => !TERMINAL_STATUSES.has(j.status)).length;

  if (jobs.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800">Job history</h3>
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-10 text-center text-slate-400 space-y-4">
          <p className="text-lg font-medium text-slate-500">No jobs yet</p>
          <div className="flex justify-center gap-6 text-sm">
            <div className="bg-white border rounded-lg px-5 py-4 text-left max-w-xs shadow-sm">
              <p className="font-semibold text-slate-700 mb-1">Small batches</p>
              <p className="text-slate-500 text-xs">Use the <strong>New Job</strong> tab to build an interaction manifest field-by-field with validation guidance.</p>
            </div>
            <div className="bg-white border rounded-lg px-5 py-4 text-left max-w-xs shadow-sm">
              <p className="font-semibold text-slate-700 mb-1">Large volumes</p>
              <p className="text-slate-500 text-xs">Use the <strong>Import CSV</strong> tab to upload hundreds of interactions at once — files over 400 rows are split automatically.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Job history ({jobs.length})</h3>
          {runningCount > 0 && (
            <p className="text-xs text-blue-600 mt-0.5">
              {runningCount} job{runningCount > 1 ? "s" : ""} still running
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {runningCount > 0 && (
            <button
              type="button"
              onClick={refreshAll}
              disabled={refreshing || !token}
              className="text-sm border border-slate-300 hover:bg-slate-50 disabled:opacity-50 px-3 py-1.5 rounded"
            >
              {refreshing ? "Refreshing…" : `Refresh running (${runningCount})`}
            </button>
          )}
          {confirmClear ? (
            <div className="flex gap-1 items-center">
              <span className="text-xs text-red-600">Sure?</span>
              <button
                type="button"
                onClick={() => { onClearAll(); setConfirmClear(false); }}
                className="text-xs bg-red-600 text-white px-2 py-1 rounded"
              >
                Yes, clear
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="text-xs border px-2 py-1 rounded"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5"
            >
              Clear history
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {["Submitted", "Job ID", "Batch", "Status", "Total", "✓", "✗", "⏳", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left text-xs font-medium text-slate-600"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.map((job) => (
                <tr key={job.jobId} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(job.submittedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {job.jobId.length > 20
                      ? `${job.jobId.slice(0, 8)}…${job.jobId.slice(-6)}`
                      : job.jobId}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {job.batchTotal != null
                      ? `${(job.batchIndex ?? 0) + 1}/${job.batchTotal}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                        STATUS_COLORS[job.status] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {job.status}
                      {job.status === "RUNNING" && (
                        <span className="ml-1 animate-pulse">●</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-center">
                    {job.interactionCounters.total}
                  </td>
                  <td className="px-4 py-2 text-xs text-center text-green-700 font-medium">
                    {job.interactionCounters.succeeded}
                  </td>
                  <td className="px-4 py-2 text-xs text-center text-red-600 font-medium">
                    {job.interactionCounters.failed}
                  </td>
                  <td className="px-4 py-2 text-xs text-center text-blue-600">
                    {job.interactionCounters.inProgress}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => onSelectJob(job.jobId)}
                      className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                    >
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
