import { useState, useCallback } from "react";
import type { CreateJobResponse, JobStatus, InteractionCounters } from "../types/api";

export interface JobRecord {
  jobId: string;
  tenantId: string;
  submittedAt: string;
  creationTime: string;
  completionTime: string | null;
  status: JobStatus | "RUNNING";
  interactionCounters: InteractionCounters;
  mediaUploadUrls?: CreateJobResponse["mediaUploadUrls"];
  batchIndex?: number;
  batchTotal?: number;
}

const STORAGE_KEY = "snf_job_history";

function load(): JobRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(jobs: JobRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

export function useJobHistory() {
  const [jobs, setJobs] = useState<JobRecord[]>(load);

  const addJob = useCallback((record: JobRecord) => {
    setJobs((prev) => {
      const next = [record, ...prev];
      save(next);
      return next;
    });
  }, []);

  const updateJob = useCallback((jobId: string, patch: Partial<JobRecord>) => {
    setJobs((prev) => {
      const next = prev.map((j) => (j.jobId === jobId ? { ...j, ...patch } : j));
      save(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setJobs([]);
  }, []);

  return { jobs, addJob, updateJob, clearAll };
}

export function jobRecordFromResponse(
  response: CreateJobResponse,
  opts?: { batchIndex?: number; batchTotal?: number }
): JobRecord {
  return {
    jobId: response.jobId,
    tenantId: response.tenantId,
    submittedAt: new Date().toISOString(),
    creationTime: response.creationTime,
    completionTime: response.completionTime,
    status: response.status,
    interactionCounters: response.interactionCounters,
    mediaUploadUrls: response.mediaUploadUrls,
    ...opts,
  };
}
