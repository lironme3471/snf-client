import { useState, useEffect, useRef, useCallback } from "react";
import { getJob } from "../api/jobs";
import type { Job, JobStatus } from "../types/api";

const TERMINAL: JobStatus[] = ["SUCCEEDED", "PARTIALLY_SUCCEEDED", "FAILED"];
const POLL_INTERVAL_MS = 5000;

export function useJobPolling(token: string, jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    if (!jobId || !token) return;
    try {
      const data = await getJob(token, jobId);
      setJob(data);
      if (!TERMINAL.includes(data.status)) {
        timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch job");
    }
  }, [jobId, token]);

  useEffect(() => {
    if (!jobId) return;
    setJob(null);
    setError(null);
    poll();
    return stop;
  }, [jobId, poll, stop]);

  return { job, error, refetch: poll };
}
