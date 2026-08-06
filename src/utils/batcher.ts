import type { InputInteraction, InteractionsIngestionManifest } from "../types/api";
import { buildManifestZip } from "./zipBuilder";
import { createJob } from "../api/jobs";
import type { CreateJobResponse } from "../types/api";

export const BATCH_SIZE = 400;

export function batchInteractions(
  interactions: InputInteraction[],
  size = BATCH_SIZE
): InputInteraction[][] {
  const batches: InputInteraction[][] = [];
  for (let i = 0; i < interactions.length; i += size) {
    batches.push(interactions.slice(i, i + size));
  }
  return batches;
}

export interface BatchResult {
  batchIndex: number;
  response?: CreateJobResponse;
  error?: string;
}

export interface BatchSubmitOptions {
  token: string;
  interactions: InputInteraction[];
  uploadUrlValidityMinutes: number;
  onProgress: (completed: number, total: number, result: BatchResult) => void;
  signal?: AbortSignal;
}

/** Submits interactions as sequential batches of up to 400, reporting progress per batch. */
export async function submitInBatches({
  token,
  interactions,
  uploadUrlValidityMinutes,
  onProgress,
  signal,
}: BatchSubmitOptions): Promise<BatchResult[]> {
  const batches = batchInteractions(interactions);
  const results: BatchResult[] = [];

  for (let i = 0; i < batches.length; i++) {
    if (signal?.aborted) break;

    const manifest: InteractionsIngestionManifest = {
      schemaVersion: "1.0",
      uploadUrlValidityMinutes,
      interactions: batches[i],
    };

    const result: BatchResult = { batchIndex: i };
    try {
      const zip = await buildManifestZip(manifest);
      result.response = await createJob(token, zip);
    } catch (err) {
      result.error = err instanceof Error ? err.message : "Unknown error";
    }

    results.push(result);
    onProgress(i + 1, batches.length, result);
  }

  return results;
}
