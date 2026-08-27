import { writeFile } from "node:fs/promises";
import type { RunState } from "./checkpoint.ts";

export function printSummary(state: RunState): void {
  const counts = { done: 0, failed: 0, pending: 0, submitted: 0, polling: 0 };
  let succeededInteractions = 0;
  let failedInteractions = 0;

  for (const batch of state.batches) {
    counts[batch.status]++;
    if (batch.finalCounters) {
      succeededInteractions += batch.finalCounters.succeeded;
      failedInteractions += batch.finalCounters.failed + batch.finalCounters.inProgress;
    }
  }

  console.log("\n=== Run summary ===");
  console.log(`Batches: ${state.batches.length} total`);
  console.log(
    `  done=${counts.done} failed=${counts.failed} pending=${counts.pending} submitted=${counts.submitted} polling=${counts.polling}`
  );
  console.log(`Interactions: ~${succeededInteractions} succeeded, ~${failedInteractions} not succeeded`);

  const failedBatches = state.batches.filter((b) => b.status === "failed");
  if (failedBatches.length > 0) {
    console.log(`\n${failedBatches.length} failed batch(es):`);
    for (const batch of failedBatches) {
      console.log(`  batch ${batch.batchIndex} (jobId=${batch.jobId ?? "n/a"}): ${batch.error}`);
    }
  }
}

export async function writeFailureReport(state: RunState, reportPath: string): Promise<void> {
  const failedBatches = state.batches.filter((b) => b.status === "failed");
  const report = {
    env: state.env,
    inputPath: state.inputPath,
    generatedAt: new Date().toISOString(),
    failedBatchCount: failedBatches.length,
    failedInteractionIds: failedBatches.flatMap((b) => b.externalInteractionIds),
    batches: failedBatches.map((b) => ({
      batchIndex: b.batchIndex,
      jobId: b.jobId,
      error: b.error,
      externalInteractionIds: b.externalInteractionIds,
      mediaUploads: b.mediaUploads,
    })),
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\nFailure report written to ${reportPath}`);
}
