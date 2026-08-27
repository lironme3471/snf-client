# Bulk inject

A resumable CLI for submitting large volumes of interactions (tens of
thousands) to the Store & Forward API — built for the 50k-interaction
use case, where a browser tab is too fragile (closing it, a network blip,
or the machine sleeping loses all progress) and the account's rate limit
(one API call per ~2 seconds) has to be respected across every call, not
just job creation.

Runs directly with Node (v22+, uses native TypeScript support — no build
step, no `tsx`/`ts-node`):

```bash
node scripts/bulk-inject/run.ts --input interactions.csv --env test --dry-run
```

## Why a separate CLI instead of the browser app

- No browser CORS — talks to CXone and S3 presigned URLs directly. The
  Cloudflare Worker and dev-server proxies in this repo exist solely to
  work around browser CORS restrictions and aren't needed here.
- Can checkpoint progress to disk after every state change and resume
  from exactly where it left off after a crash, `Ctrl+C`, or a closed
  terminal.
- Reuses the app's own validation (`src/utils/csvParser.ts`) and manifest
  building (`src/utils/zipBuilder.ts`) so behavior matches the UI exactly.

## Input format

Either a `.csv` file in the same format the app's CSV import expects
(see `generateCsvTemplate()` in `src/utils/csvParser.ts`), or a `.json`
file containing a plain array of `InputInteraction` objects
(`src/types/api.ts`).

**The input file must not change between resumed runs of the same
checkpoint** — batches are derived from it in order, and a resume matches
up checkpoint state by input path + batch composition.

## Usage

```bash
# 1. Validate only, no API calls, no auth needed
node scripts/bulk-inject/run.ts --input data.csv --env test --dry-run

# 2. Real run
node scripts/bulk-inject/run.ts --input data.csv --env test \
  --token "$SNF_TOKEN" \
  --media-dir ./media \
  --report ./failures.json

# 3. Interrupted? Just run the same command again — it picks up from the checkpoint.
node scripts/bulk-inject/run.ts --input data.csv --env test --token "$SNF_TOKEN"

# 4. Fixed whatever caused failures? Retry just the failed batches.
node scripts/bulk-inject/run.ts --input data.csv --env test --token "$SNF_TOKEN" --retry-failed
```

Run `node scripts/bulk-inject/run.ts --help` for the full flag list.

### Auth

Never pass a password as a CLI flag (it lands in shell history and process
listings). Use one of:

- `--token <bearer>` — an existing bearer token (e.g. copied from the app after logging in)
- `SNF_TOKEN` env var — same, without it appearing in your shell history
- `SNF_EMAIL` + `SNF_PASSWORD` env vars — logs in for you

### Media

Real binary media (audio/screen/attachment) needs `--media-dir`, which
resolves each interaction's `mediaFileName` from that directory. This is a
placeholder for whatever the real media source turns out to be — see
`lib/mediaResolver.ts`; swapping in an API- or bucket-backed resolver
later only requires changing that one file.

## How it works

1. **Load & validate** the whole input file up front (per-row schema
   checks plus dataset-wide duplicate-ID detection). Nothing is submitted
   if there are errors, unless `--force` is passed.
2. **Batch** into groups of ≤400 (the API's hard cap per job).
3. **Checkpoint** — every batch's state (`pending → submitted → polling →
   done/failed`) plus its media upload status is written to a JSON file
   after every transition, using an atomic write (temp file + rename) so
   a crash mid-write can't corrupt it. Default path:
   `.bulk-inject/<input-filename>.<env>.json`.
4. **Submit** — one job-creation call per batch, all serialized through a
   single rate limiter shared by every CXone API call (creation, status
   polling, interaction listing), since the account's limit is a global
   budget, not per-endpoint. 429/5xx responses retry with exponential
   backoff + jitter; auth/validation errors (4xx other than 429) fail
   immediately without wasting retries.
5. **Upload media** for each batch right after its job is created (S3
   presigned URLs aren't NICE-rate-limited, so this uses its own small
   concurrency pool, `--upload-concurrency`). Presigned URLs are
   persisted in the checkpoint so a resume shortly after a crash can
   still finish pending uploads; one already past its
   `uploadUrlExpiresAt` is marked failed instead of attempted.
6. **Poll** every submitted job to a terminal status
   (`SUCCEEDED`/`PARTIALLY_SUCCEEDED`/`FAILED`), through the same shared
   rate limiter, and record final interaction counters.
7. **Report** a summary to stdout, and optionally a JSON file
   (`--report`) listing every failed batch and interaction ID for easy
   re-submission.

## Known gaps (data/media source still TBD)

This engine takes `InputInteraction[]` as its input — wherever the real
50k records and media files end up living, only a small extraction
adapter (producing the CSV/JSON input this tool expects) and possibly a
new `MediaResolver` need to be written; nothing here needs to change.
