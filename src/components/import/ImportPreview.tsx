import { useRef, useState } from "react";
import type { CsvParseResult } from "../../utils/csvParser";
import { BATCH_SIZE, submitInBatches } from "../../utils/batcher";
import type { BatchResult } from "../../utils/batcher";
import type { JobRecord } from "../../store/jobHistory";
import { jobRecordFromResponse } from "../../store/jobHistory";

interface Props {
  result: CsvParseResult;
  token: string;
  uploadUrlValidityMinutes: number;
  onJobsCreated: (jobs: JobRecord[]) => void;
}

interface SubmitProgress {
  completed: number;
  total: number;
  results: BatchResult[];
}

export function ImportPreview({ result, token, uploadUrlValidityMinutes, onJobsCreated }: Props) {
  const { interactions, errors } = result;
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<SubmitProgress | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const batchCount = Math.ceil(interactions.length / BATCH_SIZE);

  async function handleSubmit() {
    if (!token) {
      setSubmitError("Paste your Bearer token in the header first.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setProgress({ completed: 0, total: batchCount, results: [] });
    abortRef.current = new AbortController();

    const allResults = await submitInBatches({
      token,
      interactions,
      uploadUrlValidityMinutes,
      signal: abortRef.current.signal,
      onProgress: (completed, total, result) => {
        setProgress((p) => ({
          completed,
          total,
          results: [...(p?.results ?? []), result],
        }));
      },
    });

    setSubmitting(false);

    const jobRecords: JobRecord[] = allResults
      .filter((r) => r.response)
      .map((r) =>
        jobRecordFromResponse(r.response!, {
          batchIndex: r.batchIndex,
          batchTotal: batchCount,
        })
      );

    if (jobRecords.length === 0) {
      setSubmitError("All batches failed. Check errors below.");
    } else {
      onJobsCreated(jobRecords);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    setSubmitting(false);
  }

  return (
    <div className="space-y-4">
      {/* Step 4 label */}
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
          4
        </span>
        <p className="text-sm font-medium text-slate-800">Review &amp; submit</p>
      </div>

      {/* Summary */}
      <div className="flex gap-3">
        <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <p className="text-2xl font-bold text-green-700">{interactions.length}</p>
          <p className="text-xs text-green-600">valid interactions</p>
        </div>
        <div className={`flex-1 border rounded-lg px-4 py-3 ${errors.length > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
          <p className={`text-2xl font-bold ${errors.length > 0 ? "text-red-700" : "text-slate-400"}`}>
            {errors.length}
          </p>
          <p className={`text-xs ${errors.length > 0 ? "text-red-600" : "text-slate-400"}`}>
            parse errors
          </p>
        </div>
        {batchCount > 1 && (
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-2xl font-bold text-blue-700">{batchCount}</p>
            <p className="text-xs text-blue-600">jobs (auto-batched)</p>
          </div>
        )}
      </div>

      {/* Batch notice */}
      {batchCount > 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
          {interactions.length} interactions will be split into{" "}
          <strong>{batchCount} separate jobs</strong> of up to {BATCH_SIZE} each.
          Jobs are submitted sequentially to respect rate limits.
        </div>
      )}

      {/* Parse errors */}
      {errors.length > 0 && (
        <details className="border border-red-200 rounded-lg overflow-hidden">
          <summary className="bg-red-50 px-4 py-2 text-sm font-medium text-red-700 cursor-pointer">
            {errors.length} parse error{errors.length > 1 ? "s" : ""} (rows skipped)
          </summary>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-red-50 sticky top-0">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium text-red-600 w-16">Row</th>
                  <th className="px-3 py-1.5 text-left font-medium text-red-600 w-40">Column</th>
                  <th className="px-3 py-1.5 text-left font-medium text-red-600">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {errors.map((e, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 font-mono">{e.row}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-500">{e.column ?? "—"}</td>
                    <td className="px-3 py-1.5 text-red-700">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Valid interaction preview */}
      {interactions.length > 0 && (
        <details className="border rounded-lg overflow-hidden">
          <summary className="bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 cursor-pointer">
            Preview valid interactions ({interactions.length})
          </summary>
          <div className="max-h-56 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {["ID", "Channel", "Direction", "Start time", "Agent", "Media"].map((h) => (
                    <th key={h} className="px-3 py-1.5 text-left font-medium text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {interactions.map((ix, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-mono">{ix.externalInteractionId}</td>
                    <td className="px-3 py-1.5">{ix.channelType}</td>
                    <td className="px-3 py-1.5">{ix.direction}</td>
                    <td className="px-3 py-1.5">{new Date(ix.startTime).toLocaleString()}</td>
                    <td className="px-3 py-1.5">{ix.participants[0]?.participantIdentifier}</td>
                    <td className="px-3 py-1.5">{ix.media.length > 0 ? ix.media[0].mediaType : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Submission progress */}
      {progress && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Submitting {submitting ? `job ${progress.completed + 1} of ${progress.total}…` : "complete"}
            </span>
            <span className="text-slate-500">
              {progress.completed}/{progress.total} batches
            </span>
          </div>
          <div className="bg-slate-200 rounded h-2">
            <div
              className="bg-blue-500 h-2 rounded transition-all"
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            />
          </div>
          <div className="space-y-1">
            {progress.results.map((r) => (
              <div key={r.batchIndex} className="flex items-center gap-2 text-xs">
                <span
                  className={`w-2 h-2 rounded-full ${r.error ? "bg-red-400" : "bg-green-400"}`}
                />
                <span>Batch {r.batchIndex + 1}</span>
                {r.response && (
                  <span className="text-slate-500 font-mono">{r.response.jobId}</span>
                )}
                {r.error && <span className="text-red-600">{r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {submitError && (
        <p className="text-red-600 text-sm">{submitError}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {interactions.length > 0 && !submitting && !progress && (
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm"
          >
            Submit {interactions.length} interaction{interactions.length > 1 ? "s" : ""}
            {batchCount > 1 ? ` (${batchCount} jobs)` : ""}
          </button>
        )}
        {submitting && (
          <button
            type="button"
            onClick={handleCancel}
            className="border border-red-300 text-red-600 hover:bg-red-50 px-5 py-2 rounded-lg text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
