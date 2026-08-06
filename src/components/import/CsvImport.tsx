import { useRef, useState } from "react";
import { parseCsvToInteractions, generateCsvTemplate } from "../../utils/csvParser";
import type { CsvParseResult } from "../../utils/csvParser";
import type { InputInteraction } from "../../types/api";

const STEPS = [
  {
    num: 1,
    title: "Download the template",
    detail: "Get a CSV with all supported columns and a filled-in example row.",
  },
  {
    num: 2,
    title: "Fill in your interactions",
    detail:
      "Each row = one interaction. Required: core fields + leading agent columns. Dates must be ISO 8601 and within the last 30 days.",
  },
  {
    num: 3,
    title: "Upload your CSV",
    detail:
      "Drag-and-drop or click the upload zone. The file is parsed in your browser — nothing is sent to the API yet.",
  },
  {
    num: 4,
    title: "Review & submit",
    detail:
      "Check the preview for parse errors (shown with row numbers). Click Submit — files over 400 rows are automatically split into batches and submitted sequentially.",
  },
];

const COLUMN_GROUPS = [
  {
    group: "Core interaction (required)",
    columns: [
      { name: "externalInteractionId", note: "Unique ID in your system" },
      { name: "channelType", note: "PHONE_CALL · PHONE_CALL_IVR · WORKITEM · EMAIL · CHAT · SMS · FACEBOOK · WHATSAPP · TELEGRAM · APPLE_BUSINESS · LINE · VIBER · GOOGLE_BUSINESS · SLACK · MICROSOFT_TEAMS" },
      { name: "direction", note: "INBOUND · OUTBOUND · INTERNAL" },
      { name: "startTime", note: "ISO 8601, must be within last 30 days — e.g. 2026-08-05T10:30:00.000Z" },
      { name: "endTime", note: "ISO 8601" },
      { name: "externalContactId", note: "" },
      { name: "externalContactStartTime", note: "ISO 8601" },
      { name: "subject", note: "Optional" },
    ],
  },
  {
    group: "Leading agent (required)",
    columns: [
      { name: "agentIdentifier", note: "Participant identifier, e.g. email address" },
      { name: "agentSystemName", note: "Must be pre-defined in CXone" },
      { name: "agentIdentifierType", note: "e.g. EMAIL" },
      { name: "agentIdentifierValue", note: "Value matching the identifier type" },
    ],
  },
  {
    group: "Customer participant (optional)",
    columns: [
      { name: "customerIdentifier", note: "e.g. phone number" },
      { name: "customerFrom", note: "Caller / sender address" },
      { name: "customerTo", note: "Destination address" },
    ],
  },
  {
    group: "Media — one item per row (optional)",
    columns: [
      { name: "mediaId", note: "" },
      { name: "mediaType", note: "TEXT · AUDIO · SCREEN · ATTACHMENT" },
      { name: "mediaStartTime / mediaEndTime", note: "ISO 8601 — defaults to interaction times" },
      { name: "mediaFileName", note: "Required for AUDIO · SCREEN · ATTACHMENT" },
      { name: "mediaChecksumAlgorithm", note: "e.g. MD5 — required for binary media" },
      { name: "mediaChecksumValue", note: "Hex / base64 — required for binary media" },
      { name: "mediaContent", note: "Inline text — for TEXT media only" },
    ],
  },
  {
    group: "Business data (optional, dynamic)",
    columns: [
      {
        name: "bd_KEYNAME",
        note: "Any column prefixed bd_ becomes a BusinessData entry. Key must be pre-defined in CXone.",
      },
    ],
  },
];

function StepBadge({ num }: { num: number }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
      {num}
    </span>
  );
}

interface Props {
  onParsed: (result: CsvParseResult) => void;
}

export function CsvImport({ onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  function readFile(file: File) {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      onParsed({
        interactions: [] as InputInteraction[],
        errors: [{ row: 0, message: "File must be a .csv" }],
      });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      onParsed(parseCsvToInteractions(text));
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const blob = new Blob([generateCsvTemplate()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "snf-manifest-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Numbered step guide */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-4">How to import interactions</h3>
        <ol className="relative border-l-2 border-blue-200 ml-3 space-y-5">
          {STEPS.map((s) => (
            <li key={s.num} className="ml-6">
              <span className="absolute -left-3.5 flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold">
                {s.num}
              </span>
              <p className="font-medium text-slate-800 text-sm">{s.title}</p>
              <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{s.detail}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Column reference */}
      <details className="border rounded-lg overflow-hidden">
        <summary className="bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 cursor-pointer select-none hover:bg-slate-100">
          Column reference
        </summary>
        <div className="divide-y">
          {COLUMN_GROUPS.map((g) => (
            <div key={g.group} className="px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                {g.group}
              </p>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100">
                  {g.columns.map((c) => (
                    <tr key={c.name}>
                      <td className="py-1.5 pr-4 font-mono text-blue-700 w-72 align-top">{c.name}</td>
                      <td className="py-1.5 text-slate-500 align-top">{c.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </details>

      <hr />

      {/* Step 1 action */}
      <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <StepBadge num={1} />
          <div>
            <p className="text-sm font-medium text-slate-800">Download the template</p>
            <p className="text-xs text-slate-500">Open in Excel / Google Sheets, fill in your data, then save as CSV</p>
          </div>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="text-sm bg-white border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded font-medium whitespace-nowrap shrink-0"
        >
          ↓ Download template
        </button>
      </div>

      {/* Step 3 upload zone */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <StepBadge num={3} />
          <p className="text-sm font-medium text-slate-800">
            Upload your filled CSV
            {fileName && <span className="text-slate-400 font-normal ml-2">— {fileName}</span>}
          </p>
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) readFile(file);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragging
              ? "border-blue-400 bg-blue-50"
              : fileName
              ? "border-green-400 bg-green-50"
              : "border-slate-300 hover:border-slate-400 bg-white"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readFile(file);
            }}
          />
          {fileName ? (
            <p className="text-sm text-green-700 font-medium">
              ✓ {fileName}{" "}
              <span className="font-normal text-green-600">— click to replace</span>
            </p>
          ) : (
            <>
              <p className="text-slate-500 text-sm">
                Drag &amp; drop a <span className="font-medium">.csv</span> file here, or click to browse
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Files with more than 400 rows are split into multiple jobs automatically
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
