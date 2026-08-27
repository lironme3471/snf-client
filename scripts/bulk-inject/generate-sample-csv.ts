import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

/** Generates a synthetic CSV for scale-testing the bulk-inject pipeline against Test. */

const { values } = parseArgs({
  options: {
    count: { type: "string", default: "1000" },
    out: { type: "string", default: "./scale-test.csv" },
    "with-media": { type: "boolean", default: false },
    "media-dir": { type: "string", default: "../../public" },
    "media-file-name": { type: "string", default: "sample-conversation.wav" },
  },
});

const count = Number(values.count);
const outPath = resolve(values.out as string);
const withMedia = values["with-media"] as boolean;
const mediaFileName = values["media-file-name"] as string;

// The checksum declared in the manifest must match the real file's MD5, or
// NICE will reject the media — compute it once from the actual sample file
// instead of leaving it blank/fake.
const mediaChecksum = withMedia
  ? createHash("md5")
      .update(await readFile(join(import.meta.dirname, values["media-dir"] as string, mediaFileName)))
      .digest("hex")
  : "";

const headers = [
  "externalInteractionId",
  "channelType",
  "direction",
  "startTime",
  "endTime",
  "externalContactId",
  "externalContactStartTime",
  "subject",
  "agentIdentifier",
  "agentSystemName",
  "agentIdentifierType",
  "agentIdentifierValue",
  "agentFrom",
  "agentTo",
  "customerIdentifier",
  "customerFrom",
  "customerTo",
  "mediaId",
  "mediaType",
  "mediaStartTime",
  "mediaEndTime",
  "mediaFileName",
  "mediaChecksumAlgorithm",
  "mediaChecksumValue",
  "mediaContent",
];

const now = Date.now();
const rows = [headers.join(",")];

for (let i = 0; i < count; i++) {
  const start = new Date(now - 3600_000 + i * 1000).toISOString();
  const end = new Date(now - 3600_000 + i * 1000 + 30_000).toISOString();
  const runId = `${now}-${i}`;

  const base = [
    `SCALE-TEST-${runId}`,
    withMedia ? "PHONE_CALL" : "CHAT",
    "INBOUND",
    start,
    end,
    `SCALE-CONTACT-${runId}`,
    start,
    "Scale test interaction",
    "5525",
    "Generic API System",
    "EXTERNAL_IDENTIFIER",
    "5525",
    "",
    "5525",
    "",
    "",
    "",
  ];

  const media = withMedia
    ? [`AUDIO-${runId}`, "AUDIO", "", "", mediaFileName, "MD5", mediaChecksum, ""]
    : [`TEXT-${runId}`, "TEXT", "", "", "", "", "", "Synthetic scale-test content."];

  rows.push([...base, ...media].join(","));
}

await writeFile(outPath, rows.join("\r\n"), "utf-8");
console.log(`Wrote ${count} interaction(s) to ${outPath}${withMedia ? ` (media file: ${mediaFileName})` : ""}`);
