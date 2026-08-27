import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ApiEnv } from "../../../src/api/environments.ts";
import type { CreateJobResponse, InteractionCounters } from "../../../src/types/api.ts";

export type BatchStatus = "pending" | "submitted" | "polling" | "done" | "failed";
export type MediaUploadStatus = "pending" | "done" | "failed";

export interface BatchCheckpoint {
  batchIndex: number;
  externalInteractionIds: string[];
  status: BatchStatus;
  jobId?: string;
  error?: string;
  // Persisted so a resume shortly after a crash can still finish uploads —
  // these presigned URLs are short-lived and only returned once, at job creation.
  mediaUploadUrls?: CreateJobResponse["mediaUploadUrls"];
  mediaUploads: Record<string, MediaUploadStatus>;
  finalCounters?: InteractionCounters;
}

export interface RunState {
  version: 1;
  env: ApiEnv;
  inputPath: string;
  batchSize: number;
  createdAt: string;
  updatedAt: string;
  batches: BatchCheckpoint[];
}

export function initState(opts: {
  env: ApiEnv;
  inputPath: string;
  batchSize: number;
  batchInteractionIds: string[][];
}): RunState {
  const now = new Date().toISOString();
  return {
    version: 1,
    env: opts.env,
    inputPath: opts.inputPath,
    batchSize: opts.batchSize,
    createdAt: now,
    updatedAt: now,
    batches: opts.batchInteractionIds.map((ids, batchIndex) => ({
      batchIndex,
      externalInteractionIds: ids,
      status: "pending",
      mediaUploads: {},
    })),
  };
}

export async function loadState(path: string): Promise<RunState | null> {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as RunState;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/** Writes atomically (write to a temp file, then rename) so a crash mid-write can't corrupt the checkpoint. */
export async function saveState(path: string, state: RunState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  await mkdir(dirname(path), { recursive: true });
  const tmpPath = `${path}.tmp`;
  await writeFile(tmpPath, JSON.stringify(state, null, 2), "utf-8");
  await rename(tmpPath, path);
}

export function summarize(state: RunState) {
  const counts: Record<BatchStatus, number> = {
    pending: 0,
    submitted: 0,
    polling: 0,
    done: 0,
    failed: 0,
  };
  for (const batch of state.batches) counts[batch.status]++;
  return counts;
}
