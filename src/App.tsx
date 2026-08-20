import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Header } from "./components/layout/Header";
import { JobForm } from "./components/form/JobForm";
import { JobStatusCard } from "./components/status/JobStatusCard";
import { InteractionsList } from "./components/status/InteractionsList";
import { MediaUploadPanel } from "./components/media/MediaUploadPanel";
import { CsvImport } from "./components/import/CsvImport";
import { ImportPreview } from "./components/import/ImportPreview";
import { JobDashboard } from "./components/dashboard/JobDashboard";

import { useAuth } from "./hooks/useAuth";
import { useJobPolling } from "./hooks/useJobPolling";
import { buildManifestZip } from "./utils/zipBuilder";
import { manifestSchema, type ManifestFormValues } from "./utils/validation";
import { createJob } from "./api/jobs";
import { ApiResponseError } from "./api/client";
import { useJobHistory, jobRecordFromResponse, type JobRecord } from "./store/jobHistory";
import type { CsvParseResult } from "./utils/csvParser";

type View = "form" | "import" | "dashboard" | "status";

export default function App() {
  const { token, setToken, clearToken, rememberLogin } = useAuth();
  const [view, setView] = useState<View>("form");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);
  const [mockBlobMap, setMockBlobMap] = useState<Map<string, Blob>>(new Map());

  const { jobs, addJob, updateJob, clearAll } = useJobHistory();

  const methods = useForm<ManifestFormValues>({
    resolver: zodResolver(manifestSchema),
    defaultValues: { uploadUrlValidityMinutes: 5, interactions: [] },
  });

  const uploadUrlValidityMinutes = methods.watch("uploadUrlValidityMinutes") ?? 5;

  const { job: polledJob, error: pollError, refetch } = useJobPolling(
    token,
    view === "status" ? selectedJobId : null
  );

  // keep job history in sync with polling results
  if (polledJob && selectedJobId) {
    const stored = jobs.find((j) => j.jobId === selectedJobId);
    if (stored && stored.status !== polledJob.status) {
      updateJob(selectedJobId, {
        status: polledJob.status,
        interactionCounters: polledJob.interactionCounters,
      });
    }
  }

  async function handleFormSubmit(values: ManifestFormValues) {
    if (!token) {
      setSubmitError("Please log in before submitting.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const manifest = {
        schemaVersion: "1.0" as const,
        uploadUrlValidityMinutes: values.uploadUrlValidityMinutes,
        interactions: values.interactions,
      };
      const zip = await buildManifestZip(manifest);
      const response = await createJob(token, zip);
      addJob(jobRecordFromResponse(response));
      setSelectedJobId(response.jobId);
      setView("status");
    } catch (err) {
      if (err instanceof ApiResponseError) {
        setSubmitError(
          `${err.status}: ${err.body.message ?? err.body.error_code ?? "Unknown error"}`
        );
      } else {
        setSubmitError(err instanceof Error ? err.message : "Unexpected error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleJobsCreated(newJobs: JobRecord[]) {
    newJobs.forEach((j) => addJob(j));
    setView("dashboard");
  }

  function handleSelectJob(jobId: string) {
    setSelectedJobId(jobId);
    setView("status");
  }

  const selectedJobRecord = jobs.find((j) => j.jobId === selectedJobId);
  const displayJob = polledJob ?? selectedJobRecord;
  const isRunning = (polledJob?.status ?? selectedJobRecord?.status) === "RUNNING";
  const runningCount = jobs.filter(
    (j) => !["SUCCEEDED", "PARTIALLY_SUCCEEDED", "FAILED"].includes(j.status)
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header
        token={token}
        rememberLogin={rememberLogin}
        onLoginToken={setToken}
        onLogout={clearToken}
      />

      <div className="bg-white border-b px-6">
        <nav className="flex gap-1">
          {(
            [
              { id: "form", label: "New Job" },
              { id: "import", label: "Import CSV" },
              { id: "dashboard", label: `Dashboard${jobs.length > 0 ? ` (${jobs.length})` : ""}` },
              ...(selectedJobId ? [{ id: "status", label: "Job Status" }] : []),
            ] as { id: View; label: string }[]
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                view === id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
              {id === "dashboard" && runningCount > 0 && (
                <span className="ml-1.5 w-2 h-2 bg-blue-500 rounded-full inline-block animate-pulse" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <main className="flex-1 px-6 py-6 max-w-4xl mx-auto w-full space-y-6">
        {view === "form" && (
          <>
            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {submitError}
              </div>
            )}
            {!token && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">
                Log in to enable job submission.
              </div>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
              <strong>Tip:</strong> This form is best for testing or submitting small batches (up to 400 interactions).
              For large volumes, use the{" "}
              <button type="button" onClick={() => setView("import")} className="underline font-medium">
                Import CSV
              </button>{" "}
              tab to upload a spreadsheet — files are automatically split into jobs.
            </div>
            <FormProvider {...methods}>
              <JobForm
                onSubmit={handleFormSubmit}
                submitting={submitting}
                onMockBlobs={setMockBlobMap}
              />
            </FormProvider>
          </>
        )}

        {view === "import" && (
          <div className="bg-white rounded-lg border p-6 space-y-6">
            {!token && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">
                Log in before submitting.
              </div>
            )}
            <CsvImport onParsed={setCsvResult} />
            {csvResult && (
              <>
                <hr />
                <ImportPreview
                  result={csvResult}
                  token={token}
                  uploadUrlValidityMinutes={uploadUrlValidityMinutes}
                  onJobsCreated={handleJobsCreated}
                />
              </>
            )}
          </div>
        )}

        {view === "dashboard" && (
          <JobDashboard
            jobs={jobs}
            token={token}
            onSelectJob={handleSelectJob}
            onUpdateJob={updateJob}
            onClearAll={clearAll}
          />
        )}

        {view === "status" && (
          <>
            {!selectedJobId && (
              <p className="text-slate-500 text-sm">
                Submit a job or select one from the Dashboard to view its status.
              </p>
            )}
            {displayJob && (
              <JobStatusCard job={displayJob} polling={isRunning} onRefresh={refetch} />
            )}
            {pollError && <p className="text-red-600 text-sm">{pollError}</p>}
            {selectedJobRecord?.mediaUploadUrls &&
              selectedJobRecord.mediaUploadUrls.length > 0 && (
                <MediaUploadPanel
                  uploadUrls={selectedJobRecord.mediaUploadUrls}
                  blobMap={mockBlobMap}
                />
              )}
            {selectedJobId && (
              <InteractionsList
                token={token}
                jobId={selectedJobId}
                isJobRunning={isRunning}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
