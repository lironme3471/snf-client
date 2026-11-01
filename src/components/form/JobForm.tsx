import { useState, useRef, useEffect } from "react";
import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import type { ManifestFormValues } from "../../utils/validation";
import { MOCK_GENERATORS, MOCK_LABELS, type MockType } from "../../utils/mockData";
import { MockConfigDialog } from "./MockConfigDialog";
import type { AgentConfig } from "./MockConfigDialog";
import { ParticipantForm } from "./ParticipantForm";
import { MediaForm } from "./MediaForm";
import { BusinessDataForm } from "./BusinessDataForm";
import { toDatetimeLocal, fromDatetimeLocal } from "../../utils/datetime";

const CHANNEL_TYPES = [
  "PHONE_CALL",
  "PHONE_CALL_IVR",
  "WORKITEM",
  "EMAIL",
  "CHAT",
  "SMS",
  "FACEBOOK",
  "WHATSAPP",
  "TELEGRAM",
  "APPLE_BUSINESS",
  "LINE",
  "VIBER",
  "GOOGLE_BUSINESS",
  "SLACK",
  "MICROSOFT_TEAMS",
] as const;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-400">{label}: </span>
      <span className="text-slate-700 font-medium">{value}</span>
    </div>
  );
}

function collectErrors(node: unknown, out: string[] = []): string[] {
  if (!node || typeof node !== "object") return out;
  const n = node as { message?: unknown; [k: string]: unknown };
  if (typeof n.message === "string") out.push(n.message);
  for (const [k, v] of Object.entries(n)) {
    if (k !== "ref" && k !== "message" && k !== "type") collectErrors(v, out);
  }
  return out;
}

export function InteractionForm({
  index,
  isMock,
  onMediaBlob,
}: {
  index: number;
  isMock?: boolean;
  onMediaBlob: (mediaId: string, blob: Blob) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<ManifestFormValues>();

  const iErr = errors?.interactions?.[index];
  // reveal a collapsed interaction when it has validation errors
  useEffect(() => {
    if (iErr) setExpanded(true);
  }, [iErr]);
  const values = isMock ? watch(`interactions.${index}`) : null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200 text-left"
      >
        <span className="font-medium text-sm text-slate-800">
          Interaction {index + 1}
          {isMock && <span className="ml-2 text-xs font-normal text-blue-600">(sample)</span>}
        </span>
        <span className="text-slate-500 text-xs">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && isMock && values && (
        <div className="p-4 space-y-3 bg-slate-50">
          <p className="text-xs text-slate-500 italic">
            Read-only sample — submit as-is or remove and add your own.
          </p>
          {iErr && (
            <ul className="err list-disc pl-4">
              {collectErrors(iErr).map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <Field label="Channel" value={values.channelType} />
            <Field label="Direction" value={values.direction} />
            <Field label="Start" value={values.startTime ? new Date(values.startTime).toLocaleString() : ""} />
            <Field label="End" value={values.endTime ? new Date(values.endTime).toLocaleString() : ""} />
            <Field label="Interaction ID" value={values.externalInteractionId} />
            <Field label="Contact ID" value={values.externalContactId} />
            {values.subject && <Field label="Subject" value={values.subject} />}
          </div>
          {values.participants?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1">Participants</p>
              <div className="space-y-1">
                {values.participants.map((p, i) => (
                  <div key={i} className="text-xs flex gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-white text-xs ${p.participantType === "AGENT_USER" ? "bg-blue-500" : "bg-slate-400"}`}>
                      {p.participantType}
                    </span>
                    <span className="text-slate-700">{p.participantIdentifier}</span>
                    {p.externalIdentifier && (
                      <span className="text-slate-400">{p.externalIdentifier.systemName}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {values.media?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1">Media</p>
              <div className="space-y-1">
                {values.media.map((m, i) => (
                  <div key={i} className="text-xs flex gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800">{m.mediaType}</span>
                    <span className="text-slate-600">{m.fileName ?? "inline text"}</span>
                    {(m.mediaType === "AUDIO" || m.mediaType === "SCREEN") && (
                      <span className="text-slate-400">— sample file auto-uploaded</span>
                    )}
                  </div>
                ))}
                {values.media
                  .filter((m) => m.mediaType === "TEXT" && m.content)
                  .map((m) => (
                    <pre key={m.mediaId} className="mt-2 whitespace-pre-wrap rounded bg-white p-2 text-xs text-slate-600">
                      {m.content}
                    </pre>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {expanded && !isMock && (
        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-500">
            Fields marked <span className="text-red-500">*</span> are required. Voice calls need a leading agent,
            a customer and one AUDIO media item linked to both.
          </p>
          {/* Core fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label required">External interaction ID</label>
              <input
                {...register(`interactions.${index}.externalInteractionId`)}
                className="input"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">Unique ID of this single call leg, e.g. your call or recording ID.</p>
              {iErr?.externalInteractionId && (
                <p className="err">{iErr.externalInteractionId.message}</p>
              )}
            </div>
            <div>
              <label className="label required">External contact ID</label>
              <input
                {...register(`interactions.${index}.externalContactId`)}
                className="input"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">Contact ID from your source system. Reuse it across legs of one contact (e.g. after a transfer); use the interaction ID if there is only one leg.</p>
              {iErr?.externalContactId && (
                <p className="err">{iErr.externalContactId.message}</p>
              )}
            </div>
            <div>
              <label className="label required">Channel type</label>
              <select
                {...register(`interactions.${index}.channelType`)}
                className="input"
              >
                {CHANNEL_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label required">Direction</label>
              <select
                {...register(`interactions.${index}.direction`)}
                className="input"
              >
                <option value="INBOUND">INBOUND</option>
                <option value="OUTBOUND">OUTBOUND</option>
                <option value="INTERNAL">INTERNAL</option>
              </select>
            </div>
            <div>
              <label className="label required">Start time</label>
              <Controller
                control={control}
                name={`interactions.${index}.startTime`}
                render={({ field }) => (
                  <input
                    type="datetime-local"
                    step="1"
                    value={toDatetimeLocal(field.value)}
                    onChange={(e) => field.onChange(fromDatetimeLocal(e.target.value))}
                    className="input"
                  />
                )}
              />
              {iErr?.startTime && (
                <p className="err">{iErr.startTime.message}</p>
              )}
            </div>
            <div>
              <label className="label required">End time</label>
              <Controller
                control={control}
                name={`interactions.${index}.endTime`}
                render={({ field }) => (
                  <input
                    type="datetime-local"
                    step="1"
                    value={toDatetimeLocal(field.value)}
                    onChange={(e) => field.onChange(fromDatetimeLocal(e.target.value))}
                    className="input"
                  />
                )}
              />
              {iErr?.endTime && <p className="err">{iErr.endTime.message}</p>}
            </div>
            <div>
              <label className="label required">Contact start time</label>
              <Controller
                control={control}
                name={`interactions.${index}.externalContactStartTime`}
                render={({ field }) => (
                  <input
                    type="datetime-local"
                    step="1"
                    value={toDatetimeLocal(field.value)}
                    onChange={(e) => field.onChange(fromDatetimeLocal(e.target.value))}
                    className="input"
                  />
                )}
              />
              <p className="text-[11px] text-slate-400 mt-0.5">When the whole contact began. Equals start time for a single-leg call.</p>
              {iErr?.externalContactStartTime && (
                <p className="err">{iErr.externalContactStartTime.message}</p>
              )}
            </div>
            <div>
              <label className="label">Subject (optional)</label>
              <input
                {...register(`interactions.${index}.subject`)}
                className="input"
                placeholder="optional"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Controller
              control={control}
              name={`interactions.${index}.hasMultipleInteractions`}
              render={({ field }) => (
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  Has multiple interactions
                </label>
              )}
            />
            <Controller
              control={control}
              name={`interactions.${index}.isFirstInteraction`}
              render={({ field }) => (
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value ?? true}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  Is first interaction
                </label>
              )}
            />
          </div>

          <hr />
          <ParticipantForm interactionIndex={index} />
          <hr />
          <MediaForm interactionIndex={index} onMediaBlob={onMediaBlob} />
          <hr />
          <BusinessDataForm interactionIndex={index} />
        </div>
      )}
    </div>
  );
}

export function JobForm({
  onSubmit,
  submitting,
  onMockBlobs,
}: {
  onSubmit: (values: ManifestFormValues) => void;
  submitting: boolean;
  onMockBlobs: (blobs: Map<string, Blob>) => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useFormContext<ManifestFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "interactions",
  });

  const [mockType, setMockType] = useState<MockType>("voice");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [mockFieldIds, setMockFieldIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastInteractionRef = useRef<HTMLDivElement | null>(null);
  const pendingMockRef = useRef(false);

  // after mock append: register its field ID and scroll it into view
  useEffect(() => {
    if (!pendingMockRef.current || fields.length === 0) return;
    pendingMockRef.current = false;
    const newId = fields[fields.length - 1].id;
    setMockFieldIds((prev) => { const next = new Set(prev); next.add(newId); return next; });
    setTimeout(() => lastInteractionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, [fields.length]);

  function handleMockConfirm(cfg: AgentConfig) {
    MOCK_GENERATORS[mockType](cfg).then(({ interaction, mediaBlobs }) => {
      onMockBlobs(mediaBlobs);
      pendingMockRef.current = true;
      append(interaction);
      setDialogOpen(false);
    });
  }

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Blank interaction pre-shaped for a voice call: agent + customer, one AUDIO media slot
  function addInteraction() {
    let saved: Partial<AgentConfig> = {};
    try {
      saved = JSON.parse(localStorage.getItem("snf_mock_agent_config") ?? "{}");
    } catch {
      /* ignore */
    }
    const audioId = `AUDIO-${Date.now()}`;
    append({
      externalInteractionId: `INT-${Date.now()}`,
      channelType: "PHONE_CALL",
      direction: "INBOUND",
      startTime: "",
      endTime: "",
      externalContactId: "",
      externalContactStartTime: "",
      hasMultipleInteractions: false,
      isFirstInteraction: true,
      participants: [
        {
          participantType: "AGENT_USER",
          participantIdentifier: saved.identifierValue ?? "",
          isLeadingAgentUser: true,
          participantMediaReferences: [{ mediaId: audioId, streamId: 1 }],
          externalIdentifier: {
            systemName: saved.systemName ?? "",
            identifierType: saved.identifierType ?? "",
            value: saved.identifierValue ?? "",
          },
        },
        {
          participantType: "CUSTOMER",
          participantIdentifier: "",
          isLeadingAgentUser: false,
          participantMediaReferences: [{ mediaId: audioId, streamId: 0 }],
        },
      ],
      media: [{ mediaId: audioId, mediaType: "AUDIO", startTime: "", endTime: "" }],
    });
  }

  function handleInvalidSubmit() {
    setValidationMessage("Please fix the highlighted fields before submitting.");
  }

  return (
    <form
      onSubmit={handleSubmit((values) => {
        setValidationMessage(null);
        onSubmit(values);
      }, handleInvalidSubmit)}
      className="space-y-6"
    >
      {validationMessage && (
        <p className="err" role="alert">
          {validationMessage}
        </p>
      )}
      {dialogOpen && (
        <MockConfigDialog
          onConfirm={handleMockConfirm}
          onCancel={() => setDialogOpen(false)}
        />
      )}
      {/* Job-level settings */}
      <div className="bg-white rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold text-slate-800">Job settings</h3>
        <div className="flex items-center gap-4">
          <label className="label whitespace-nowrap">
            Upload URL validity (minutes)
          </label>
          <input
            type="range"
            min={5}
            max={60}
            step={1}
            {...register("uploadUrlValidityMinutes", { valueAsNumber: true, setValueAs: (v) => Number(v) })}
            className="flex-1"
          />
          <Controller
            control={control}
            name="uploadUrlValidityMinutes"
            render={({ field }) => (
              <span className="text-sm font-medium w-8 text-center">
                {field.value ?? 5}
              </span>
            )}
          />
        </div>
        {errors.uploadUrlValidityMinutes && (
          <p className="err">{errors.uploadUrlValidityMinutes.message}</p>
        )}
      </div>

      {/* Interactions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">
            Interactions ({fields.length})
          </h3>
          <div className="flex gap-2">
            {/* Split-button: left side appends the selected mock type, right chevron opens picker */}
            <div ref={dropdownRef} className="relative flex">
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                disabled={fields.length >= 400}
                className="text-sm border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-l disabled:opacity-50"
              >
                Try it - {MOCK_LABELS[mockType]}
              </button>
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                disabled={fields.length >= 400}
                className="text-sm border border-l-0 border-slate-300 hover:bg-slate-50 px-2 py-1.5 rounded-r disabled:opacity-50"
                aria-label="Choose mock type"
              >
                ▾
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-slate-200 rounded-lg shadow-lg min-w-max">
                  {(Object.keys(MOCK_GENERATORS) as MockType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setMockType(type); setDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg ${
                        type === mockType ? "font-semibold text-blue-600" : "text-slate-700"
                      }`}
                    >
                      {MOCK_LABELS[type]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={addInteraction}
              disabled={fields.length >= 400}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded disabled:opacity-50"
            >
              + Add interaction
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {mockType === "voice"
              ? "Injects a sample voice recording."
              : "Injects sample voice and matching screen recordings."}
          </p>
        </div>

        {typeof errors.interactions?.message === "string" && (
          <p className="err">{errors.interactions.message}</p>
        )}

        {fields.map((field, index) => (
          <div
            key={field.id}
            ref={index === fields.length - 1 ? lastInteractionRef : null}
            className="relative"
          >
            <InteractionForm
              index={index}
              isMock={mockFieldIds.has(field.id)}
              onMediaBlob={(id, blob) => onMockBlobs(new Map([[id, blob]]))}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="absolute top-2 right-12 text-red-400 hover:text-red-600 text-xs px-2 py-1"
            >
              Remove
            </button>
          </div>
        ))}

        {fields.length === 0 && (
          <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-lg space-y-2">
            <p>No interactions yet.</p>
            <p className="text-xs">
              Click <span className="font-medium text-slate-600">Try it</span> to add a sample voice interaction, or{" "}
              <span className="font-medium text-slate-600">+ Add interaction</span> to start from scratch.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || fields.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg"
        >
          {submitting ? "Submitting…" : "Submit job"}
        </button>
      </div>
    </form>
  );
}
