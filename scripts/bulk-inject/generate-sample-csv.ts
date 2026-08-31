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

const agents = [
  { id: "agent-001", name: "Support Agent 1", system: "Generic API System" },
  { id: "agent-002", name: "Support Agent 2", system: "Generic API System" },
  { id: "agent-003", name: "Support Agent 3", system: "Generic API System" },
  { id: "agent-004", name: "Support Agent 4", system: "Generic API System" },
  { id: "agent-005", name: "Support Agent 5", system: "Generic API System" },
];

const customers = [
  { id: "customer-001", from: "+1-555-0001", to: "+1-800-SUPPORT" },
  { id: "customer-002", from: "+1-555-0002", to: "+1-800-SUPPORT" },
  { id: "customer-003", from: "+1-555-0003", to: "+1-800-SUPPORT" },
  { id: "customer-004", from: "+1-555-0004", to: "+1-800-SUPPORT" },
  { id: "customer-005", from: "+1-555-0005", to: "+1-800-SUPPORT" },
];

const subjects = [
  "Account inquiry",
  "Technical support",
  "Billing question",
  "Service complaint",
  "Feature request",
];

for (let i = 0; i < count; i++) {
  const start = new Date(now - 3600_000 + i * 1000).toISOString();
  const end = new Date(now - 3600_000 + i * 1000 + 30_000).toISOString();
  const runId = `${now}-${i}`;

  const agent = agents[i % agents.length];
  const customer = customers[i % customers.length];
  const subject = subjects[i % subjects.length];
  const channelType = withMedia ? "PHONE_CALL" : "CHAT";

  const base = [
    `SCALE-TEST-${runId}`,
    channelType,
    "INBOUND",
    start,
    end,
    `CONTACT-${runId}`,
    start,
    subject,
    agent.id,
    agent.system,
    "EXTERNAL_IDENTIFIER",
    agent.id,
    agent.id, // agentFrom
    "", // agentTo
    "", // customerIdentifier
    "", // customerFrom
    "", // customerTo
  ];

  const media = withMedia
    ? [`AUDIO-${runId}`, "AUDIO", start, end, mediaFileName, "MD5", mediaChecksum, ""]
    : [`TEXT-${runId}`, "TEXT", "", "", "", "", "", "Customer inquiry and support response."];

  rows.push([...base, ...media].join(","));
}

await writeFile(outPath, rows.join("\r\n"), "utf-8");
console.log(`Wrote ${count} interaction(s) to ${outPath}${withMedia ? ` (media file: ${mediaFileName})` : ""}`);
