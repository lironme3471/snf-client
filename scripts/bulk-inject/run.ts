import { parseArgs } from "node:util";
import { basename, resolve } from "node:path";
import type { ApiEnv } from "../../src/api/environments.ts";
import type { InputInteraction } from "../../src/types/api.ts";
import { chunk } from "./lib/chunk.ts";
import { initState, loadState, saveState } from "./lib/checkpoint.ts";
import { loadInteractions } from "./lib/loadInput.ts";
import { buildManifestZipBuffer } from "./lib/manifestZip.ts";
import { localDiskResolver, type MediaResolver } from "./lib/mediaResolver.ts";
import { createJob, getJob, login } from "./lib/niceApi.ts";
import { createRateLimiter, isRetryableHttpError, withRetry } from "./lib/rateLimiter.ts";
import { printSummary, writeFailureReport } from "./lib/report.ts";
import { uploadBatchMedia } from "./lib/uploadBatchMedia.ts";
import { validateDataset } from "./lib/validate.ts";

const MAX_BATCH_SIZE = 400; // hard cap enforced by the Store & Forward API

const TERMINAL_JOB_STATUSES = new Set(["SUCCEEDED", "PARTIALLY_SUCCEEDED", "FAILED"]);

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: "string" },
      env: { type: "string" },
      token: { type: "string" },
      "media-dir": { type: "string" },
      checkpoint: { type: "string" },
      "upload-concurrency": { type: "string", default: "5" },
      "rate-limit-ms": { type: "string", default: "2100" },
      "upload-url-minutes": { type: "string", default: "15" },
      "dry-run": { type: "boolean", default: false },
      "retry-failed": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      report: { type: "string" },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help || !values.input || !values.env) {
    console.log(`Usage: node run.ts --input <file.csv|file.json> --env <test|prod> [options]

Required:
  --input <path>            CSV or JSON file of interactions
  --env <test|prod>         Which NICE CXone environment to submit to

Auth (one of):
  --token <bearer>          Use an existing bearer token
  SNF_TOKEN env var         Same, via environment variable
  SNF_EMAIL / SNF_PASSWORD  Log in with credentials (env vars only, never flags)

Options:
  --media-dir <path>        Directory to resolve binary media files from (by fileName)
  --checkpoint <path>       Checkpoint file path (default: .bulk-inject/<input>.<env>.json)
  --upload-concurrency <n>  Concurrent media uploads (default 5)
  --rate-limit-ms <n>       Minimum ms between CXone API calls (default 2100)
  --upload-url-minutes <n>  Requested presigned URL validity in minutes (default 15)
  --dry-run                 Validate and build manifests only; no API calls, no token needed
  --retry-failed            Reset previously-failed batches to pending and retry them
  --force                   Proceed even if validation finds errors
  --report <path>           Write a JSON report of failed batches on completion
`);
    process.exit(values.help ? 0 : 1);
  }

  const env = values.env as string;
  if (env !== "test" && env !== "prod") {
    console.error(`--env must be "test" or "prod", got "${env}"`);
    process.exit(1);
  }
  const apiEnv = env as ApiEnv;

  const inputPath = resolve(values.input as string);
  const dryRun = values["dry-run"] as boolean;

  console.log(`Loading interactions from ${inputPath}...`);
  const { interactions, errors } = await loadInteractions(inputPath);
  const datasetErrors = validateDataset(interactions);
  const allErrors = [...errors, ...datasetErrors];

  if (allErrors.length > 0) {
    console.error(`\nFound ${allErrors.length} validation error(s):`);
    for (const e of allErrors.slice(0, 50)) {
      console.error(`  row ${e.row}${e.column ? ` [${e.column}]` : ""}: ${e.message}`);
    }
    if (allErrors.length > 50) console.error(`  ...and ${allErrors.length - 50} more`);
    if (!values.force) {
      console.error("\nAborting (pass --force to submit anyway). 0 interactions submitted.");
      process.exit(1);
    }
    console.error("\n--force set, continuing despite errors.");
  }

  console.log(`Loaded ${interactions.length} valid interaction(s).`);

  const batches = chunk(interactions, MAX_BATCH_SIZE);
  const checkpointPath = resolve(
    (values.checkpoint as string) ?? `.bulk-inject/${basename(inputPath)}.${apiEnv}.json`
  );

  let state = await loadState(checkpointPath);
  if (state) {
    if (state.inputPath !== inputPath || state.env !== apiEnv) {
      console.error(
        `Checkpoint at ${checkpointPath} was created for a different input/env (${state.inputPath}, ${state.env}). ` +
          `Use --checkpoint to point at a different file, or remove the existing one to start fresh.`
      );
      process.exit(1);
    }
    if (state.batches.length !== batches.length) {
      console.error(
        `Checkpoint has ${state.batches.length} batches but the input now produces ${batches.length}. ` +
          `The input file must not change between resumed runs. Remove the checkpoint to start over.`
      );
      process.exit(1);
    }
    console.log(`Resuming from checkpoint ${checkpointPath}`);
    if (values["retry-failed"]) {
      const failed = state.batches.filter((b) => b.status === "failed");
      for (const batch of failed) {
        batch.status = "pending";
        batch.error = undefined;
        batch.jobId = undefined;
        batch.mediaUploadUrls = undefined;
        batch.mediaUploads = {};
      }
      console.log(`--retry-failed: reset ${failed.length} failed batch(es) to pending`);
    }
  } else {
    state = initState({
      env: apiEnv,
      inputPath,
      batchSize: MAX_BATCH_SIZE,
      batchInteractionIds: batches.map((b) => b.map((i) => i.externalInteractionId)),
    });
    if (!dryRun) await saveState(checkpointPath, state);
    console.log(`Starting new run: ${batches.length} batch(es), checkpoint at ${checkpointPath}`);
  }

  const byId = new Map<string, InputInteraction>();
  for (const interaction of interactions) byId.set(interaction.externalInteractionId, interaction);

  function resolveBatchInteractions(ids: string[]): InputInteraction[] {
    return ids.map((id) => {
      const found = byId.get(id);
      if (!found) throw new Error(`Interaction ${id} from checkpoint not found in current input file`);
      return found;
    });
  }

  const uploadUrlValidityMinutes = Number(values["upload-url-minutes"]);

  if (dryRun) {
    console.log("\n--dry-run: building manifests only, no API calls will be made.\n");
    for (const batch of state.batches) {
      const batchInteractions = resolveBatchInteractions(batch.externalInteractionIds);
      const zip = await buildManifestZipBuffer({
        schemaVersion: "1.0",
        uploadUrlValidityMinutes,
        interactions: batchInteractions,
      });
      const mediaCount = batchInteractions.reduce((n, i) => n + i.media.length, 0);
      console.log(
        `  batch ${batch.batchIndex}: ${batchInteractions.length} interactions, ${mediaCount} media item(s), manifest.zip ${zip.length} bytes`
      );
    }
    console.log("\nDry run complete. No jobs were created.");
    return;
  }

  const token =
    (values.token as string | undefined) ??
    process.env.SNF_TOKEN ??
    (await (async () => {
      const email = process.env.SNF_EMAIL;
      const password = process.env.SNF_PASSWORD;
      if (!email || !password) {
        console.error(
          "No credentials found. Pass --token, set SNF_TOKEN, or set SNF_EMAIL and SNF_PASSWORD."
        );
        process.exit(1);
      }
      console.log(`Logging in as ${email} (${apiEnv})...`);
      return login(apiEnv, email, password);
    })());

  const mediaResolver: MediaResolver = values["media-dir"]
    ? localDiskResolver(resolve(values["media-dir"] as string))
    : {
        resolve() {
          throw new Error("This interaction has media but no --media-dir was configured");
        },
      };

  const rateLimitMs = Number(values["rate-limit-ms"]);
  const uploadConcurrency = Number(values["upload-concurrency"]);
  const limited = createRateLimiter(rateLimitMs);
  const retryOpts = {
    isRetryable: isRetryableHttpError,
    onRetry: (err: unknown, attempt: number, delayMs: number) =>
      console.log(`  retry ${attempt} after ${Math.round(delayMs)}ms: ${message(err)}`),
  };

  const persist = () => saveState(checkpointPath, state!);

  // Stage A: submit any batch not yet submitted, then upload its media.
  for (const batch of state.batches) {
    if (batch.status !== "pending" && batch.status !== "submitted") continue;
    const batchInteractions = resolveBatchInteractions(batch.externalInteractionIds);

    try {
      if (batch.status === "pending") {
        const zip = await buildManifestZipBuffer({
          schemaVersion: "1.0",
          uploadUrlValidityMinutes,
          interactions: batchInteractions,
        });
        const response = await limited(() => withRetry(() => createJob(apiEnv, token, zip), retryOpts));
        batch.jobId = response.jobId;
        batch.mediaUploadUrls = response.mediaUploadUrls;
        batch.status = "submitted";
        await persist();
        console.log(`batch ${batch.batchIndex}: created job ${response.jobId}`);
      }

      await uploadBatchMedia(batch, batchInteractions, mediaResolver, uploadConcurrency);
      batch.status = "polling";
      await persist();
    } catch (err) {
      batch.status = "failed";
      batch.error = message(err);
      await persist();
      console.error(`batch ${batch.batchIndex}: FAILED - ${batch.error}`);
    }
  }

  // Stage B: poll every submitted job to a terminal status.
  let inFlight = state.batches.filter((b) => b.status === "polling");
  while (inFlight.length > 0) {
    for (const batch of inFlight) {
      try {
        const job = await limited(() => withRetry(() => getJob(apiEnv, token, batch.jobId!), retryOpts));
        if (TERMINAL_JOB_STATUSES.has(job.status)) {
          batch.finalCounters = job.interactionCounters;
          batch.status = job.status === "FAILED" ? "failed" : "done";
          if (job.status === "FAILED") batch.error = "Job finished with status FAILED";
          console.log(
            `batch ${batch.batchIndex}: job ${job.status} (${job.interactionCounters.succeeded}/${job.interactionCounters.total} succeeded)`
          );
        }
      } catch (err) {
        console.error(`batch ${batch.batchIndex}: poll error - ${message(err)}`);
      }
      await persist();
    }
    inFlight = state.batches.filter((b) => b.status === "polling");
  }

  printSummary(state);
  if (values.report) await writeFailureReport(state, resolve(values.report as string));

  const hasFailures = state.batches.some((b) => b.status === "failed");
  process.exit(hasFailures ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", message(err));
  process.exit(1);
});
