import type { InputInteraction, ChannelType, Direction, MediaType } from "../types/api";

export interface CsvRowError {
  row: number;
  column?: string;
  message: string;
}

export interface CsvParseResult {
  interactions: InputInteraction[];
  errors: CsvRowError[];
}

const REQUIRED_COLS = [
  "externalInteractionId",
  "channelType",
  "direction",
  "startTime",
  "endTime",
  "externalContactId",
  "externalContactStartTime",
  "agentIdentifier",
  "agentSystemName",
  "agentIdentifierType",
  "agentIdentifierValue",
] as const;

function parseRow(
  row: Record<string, string>,
  rowNum: number,
  errors: CsvRowError[]
): InputInteraction | null {
  const err = (column: string, message: string) =>
    errors.push({ row: rowNum, column, message });

  for (const col of REQUIRED_COLS) {
    if (!row[col]?.trim()) {
      err(col, `Missing required column "${col}"`);
    }
  }

  const startTime = row["startTime"]?.trim();
  const endTime = row["endTime"]?.trim();
  const contactStartTime = row["externalContactStartTime"]?.trim();

  if (startTime && isNaN(Date.parse(startTime)))
    err("startTime", "Invalid date-time format");
  if (endTime && isNaN(Date.parse(endTime)))
    err("endTime", "Invalid date-time format");
  if (contactStartTime && isNaN(Date.parse(contactStartTime)))
    err("externalContactStartTime", "Invalid date-time format");

  if (
    startTime &&
    !isNaN(Date.parse(startTime)) &&
    Date.now() - Date.parse(startTime) > 30 * 24 * 60 * 60 * 1000
  ) {
    err("startTime", "Interactions older than 30 days are rejected by the API");
  }

  // return null if required fields are missing so we don't push a broken object
  if (errors.some((e) => e.row === rowNum)) return null;

  const mediaId = row["mediaId"]?.trim();
  const mediaType = row["mediaType"]?.trim() as MediaType | undefined;
  const hasMedia = !!mediaId;
  const isBinaryMedia =
    hasMedia &&
    (mediaType === "AUDIO" || mediaType === "SCREEN" || mediaType === "ATTACHMENT");

  if (isBinaryMedia) {
    if (!row["mediaFileName"]?.trim())
      err("mediaFileName", "fileName required for binary media");
    if (!row["mediaChecksumAlgorithm"]?.trim() || !row["mediaChecksumValue"]?.trim())
      err("mediaChecksumAlgorithm", "checksum required for binary media");
  }

  if (errors.some((e) => e.row === rowNum)) return null;

  // collect dynamic bd_* columns into businessData
  const businessData = Object.entries(row)
    .filter(([k, v]) => k.startsWith("bd_") && v?.trim())
    .map(([k, v]) => ({ key: k.slice(3), value: v.trim() }));

  const customerIdentifier = row["customerIdentifier"]?.trim();

  const interaction: InputInteraction = {
    externalInteractionId: row["externalInteractionId"].trim(),
    channelType: row["channelType"].trim() as ChannelType,
    direction: row["direction"].trim() as Direction,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    externalContactId: row["externalContactId"].trim(),
    externalContactStartTime: new Date(contactStartTime).toISOString(),
    ...(row["subject"]?.trim() && { subject: row["subject"].trim() }),
    participants: [
      {
        participantType: "AGENT_USER",
        participantIdentifier: row["agentIdentifier"].trim(),
        isLeadingAgentUser: true,
        participantMediaReferences: [],
        externalIdentifier: {
          systemName: row["agentSystemName"].trim(),
          identifierType: row["agentIdentifierType"].trim(),
          value: row["agentIdentifierValue"].trim(),
        },
      },
      ...(customerIdentifier
        ? [
            {
              participantType: "CUSTOMER" as const,
              participantIdentifier: customerIdentifier,
              isLeadingAgentUser: false,
              participantMediaReferences: [],
              ...(row["customerFrom"]?.trim() && {
                participantFrom: row["customerFrom"].trim(),
              }),
              ...(row["customerTo"]?.trim() && {
                participantTo: row["customerTo"].trim(),
              }),
            },
          ]
        : []),
    ],
    media: hasMedia
      ? [
          {
            mediaId,
            mediaType: mediaType!,
            startTime: new Date(
              row["mediaStartTime"]?.trim() || startTime
            ).toISOString(),
            endTime: new Date(
              row["mediaEndTime"]?.trim() || endTime
            ).toISOString(),
            ...(row["mediaFileName"]?.trim() && {
              fileName: row["mediaFileName"].trim(),
            }),
            ...(row["mediaChecksumAlgorithm"]?.trim() &&
              row["mediaChecksumValue"]?.trim() && {
                checksum: {
                  algorithm: row["mediaChecksumAlgorithm"].trim(),
                  value: row["mediaChecksumValue"].trim(),
                },
              }),
            ...(row["mediaContent"]?.trim() && {
              content: row["mediaContent"].trim(),
            }),
          },
        ]
      : [],
    ...(businessData.length > 0 && { businessData }),
  };

  return interaction;
}

/** Parses RFC 4180-compatible CSV text, handling quoted fields with embedded commas/newlines. */
function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 2;
      } else if (ch === '"') {
        inQuotes = false;
        i++;
      } else {
        field += ch;
        i++;
      }
    } else if (ch === '"') {
      inQuotes = true;
      i++;
    } else if (ch === ",") {
      row.push(field);
      field = "";
      i++;
    } else if (ch === "\r" && text[i + 1] === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      i += 2;
    } else if (ch === "\n" || ch === "\r") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      i++;
    } else {
      field += ch;
      i++;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim()));
}

export function parseCsvToInteractions(text: string): CsvParseResult {
  const rows = parseCsvText(text);
  if (rows.length < 2) {
    return {
      interactions: [],
      errors: [{ row: 0, message: "CSV must contain a header row and at least one data row" }],
    };
  }

  const headers = rows[0].map((h) => h.trim());
  const interactions: InputInteraction[] = [];
  const errors: CsvRowError[] = [];

  for (let i = 1; i < rows.length; i++) {
    const rowObj: Record<string, string> = {};
    headers.forEach((h, j) => {
      rowObj[h] = rows[i][j] ?? "";
    });

    const interaction = parseRow(rowObj, i + 1, errors);
    if (interaction) interactions.push(interaction);
  }

  return { interactions, errors };
}

const EXAMPLE_START = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const EXAMPLE_END = new Date(Date.now() - 30 * 60 * 1000).toISOString();

export function generateCsvTemplate(): string {
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
    "bd_customField1",
  ];

  const example = [
    "INT-001",
    "PHONE_CALL",
    "INBOUND",
    EXAMPLE_START,
    EXAMPLE_END,
    "CONTACT-001",
    EXAMPLE_START,
    "Support call",
    "agent@company.com",
    "AcmeRecordingSystem",
    "EMAIL",
    "agent@company.com",
    "+1-555-000-0000",
    "+1-555-000-0000",
    "",
    "MEDIA-001",
    "AUDIO",
    EXAMPLE_START,
    EXAMPLE_END,
    "recording.wav",
    "MD5",
    "d41d8cd98f00b204e9800998ecf8427e",
    "",
    "custom-value-1",
  ];

  return [headers.join(","), example.join(",")].join("\r\n");
}
