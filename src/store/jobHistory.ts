import { useState, useCallback, useEffect } from "react";
import type { CreateJobResponse, JobStatus, InteractionCounters } from "../types/api";
import type { ApiEnv } from "../api/environments";

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

const LEGACY_STORAGE_KEY = "snf_job_history";

function storageKey(env: ApiEnv): string {
  return `snf_job_history_${env}`;
}

// One-time migration: history predating the test/prod toggle lived under one
// shared key. Treat it as test-environment data so it isn't lost or mixed with prod.
function migrateLegacyHistory() {
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy === null) return;
  if (localStorage.getItem(storageKey("test")) === null) {
    localStorage.setItem(storageKey("test"), legacy);
  }
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function load(env: ApiEnv): JobRecord[] {
  migrateLegacyHistory();
  try {
    return JSON.parse(localStorage.getItem(storageKey(env)) ?? "[]");
  } catch {
    return [];
  }
}

function save(env: ApiEnv, jobs: JobRecord[]) {
  localStorage.setItem(storageKey(env), JSON.stringify(jobs));
}

export function useJobHistory(env: ApiEnv) {
  const [jobs, setJobs] = useState<JobRecord[]>(() => load(env));

  useEffect(() => {
    setJobs(load(env));
  }, [env]);

  const addJob = useCallback((record: JobRecord) => {
    setJobs((prev) => {
      const next = [record, ...prev];
      save(env, next);
      return next;
    });
  }, [env]);

  const updateJob = useCallback((jobId: string, patch: Partial<JobRecord>) => {
    setJobs((prev) => {
      const next = prev.map((j) => (j.jobId === jobId ? { ...j, ...patch } : j));
      save(env, next);
      return next;
    });
  }, [env]);

  const clearAll = useCallback(() => {
    localStorage.removeItem(storageKey(env));
    setJobs([]);
  }, [env]);

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
