import type { Job, CreateJobResponse } from "../../types/api";
import type { JobRecord } from "../../store/jobHistory";

const STATUS_COLORS: Record<string, string> = {
  RUNNING: "bg-blue-100 text-blue-800",
  SUCCEEDED: "bg-green-100 text-green-800",
  PARTIALLY_SUCCEEDED: "bg-yellow-100 text-yellow-800",
  FAILED: "bg-red-100 text-red-800",
};

interface Props {
  job: Job | CreateJobResponse | JobRecord;
  polling?: boolean;
  onRefresh?: () => void;
}

export function JobStatusCard({ job, polling, onRefresh }: Props) {
  const { jobId, status, creationTime, completionTime, interactionCounters } = job;
  const counters = interactionCounters ?? { total: 0, succeeded: 0, failed: 0, inProgress: 0 };

  return (
    <div className="bg-white rounded-lg border p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Job ID</p>
          <p className="font-mono text-sm font-medium break-all">{jobId}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700"}`}
        >
          {status}
          {polling && status === "RUNNING" && (
            <span className="ml-1 animate-pulse">●</span>
          )}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 text-center">
        <StatBox label="Total" value={counters.total} color="slate" />
        <StatBox label="Succeeded" value={counters.succeeded} color="green" />
        <StatBox label="Failed" value={counters.failed} color="red" />
        <StatBox label="In progress" value={counters.inProgress} color="blue" />
      </div>

      <div className="flex gap-6 text-xs text-slate-500">
        <span>Created: {new Date(creationTime).toLocaleString()}</span>
        {completionTime && (
          <span>Completed: {new Date(completionTime).toLocaleString()}</span>
        )}
      </div>

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs text-blue-600 hover:underline"
        >
          Refresh now
        </button>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const bg: Record<string, string> = {
    slate: "bg-slate-50",
    green: "bg-green-50",
    red: "bg-red-50",
    blue: "bg-blue-50",
  };
  const text: Record<string, string> = {
    slate: "text-slate-700",
    green: "text-green-700",
    red: "text-red-700",
    blue: "text-blue-700",
  };
  return (
    <div className={`${bg[color]} rounded p-2`}>
      <p className={`text-xl font-bold ${text[color]}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
