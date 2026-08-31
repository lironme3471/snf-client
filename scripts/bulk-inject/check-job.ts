import { parseArgs } from "node:util";
import type { ApiEnv } from "../../src/api/environments.ts";
import { listJobInteractions } from "./lib/niceApi.ts";

/** Fetches per-interaction status/errorMessage for a job — use to see why interactions failed. */

const { values, positionals } = parseArgs({
  options: {
    env: { type: "string" },
    token: { type: "string" },
    "job-id": { type: "string" },
  },
  allowPositionals: true,
});

const env = (values.env ?? "test") as ApiEnv;
const token = (values.token as string | undefined) ?? process.env.SNF_TOKEN;
const jobId = (values["job-id"] as string | undefined) ?? positionals[0];

if (!token || !jobId) {
  console.log(`Usage: node scripts/bulk-inject/check-job.ts --job-id <id> --env <test|prod> --token <bearer>
  (or set SNF_TOKEN env var instead of --token)`);
  process.exit(1);
}

const page = await listJobInteractions(env, token, jobId);
for (const i of page.interactions) {
  console.log(`${i.interactionId}: ${i.status}${i.errorCode ? ` [${i.errorCode}]` : ""}`);
  if (i.errorMessage) console.log(`  ${i.errorMessage}`);
}
