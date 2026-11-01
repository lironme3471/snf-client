import {
  useFormContext,
  useFieldArray,
  Controller,
} from "react-hook-form";
import type { ManifestFormValues } from "../../utils/validation";

interface Props {
  interactionIndex: number;
}

function MediaRefs({
  interactionIndex,
  participantIndex,
}: {
  interactionIndex: number;
  participantIndex: number;
}) {
  const { register, control, watch } = useFormContext<ManifestFormValues>();
  const base = `interactions.${interactionIndex}.participants.${participantIndex}.participantMediaReferences` as const;
  const { fields, append, remove } = useFieldArray({ control, name: base });
  const media = watch(`interactions.${interactionIndex}.media`) ?? [];

  return (
    <div className="border-t pt-2 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-600">Media references (optional)</p>
        <button
          type="button"
          onClick={() => append({ mediaId: media[0]?.mediaId ?? "", streamId: 0 })}
          disabled={media.length === 0}
          title={media.length === 0 ? "Add media first" : undefined}
          className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded disabled:opacity-50"
        >
          + Link media
        </button>
      </div>
      {fields.map((f, ri) => (
        <div key={f.id} className="flex items-center gap-2">
          <select {...register(`${base}.${ri}.mediaId`)} className="input flex-1">
            {media.map((m, i) => (
              <option key={i} value={m.mediaId}>
                {m.mediaType} — {m.mediaId}
              </option>
            ))}
          </select>
          <input
            type="number"
            {...register(`${base}.${ri}.streamId`)}
            className="input w-24"
            placeholder="stream"
            title="Stream ID: which audio channel belongs to this participant"
          />
          <button type="button" onClick={() => remove(ri)} className="text-red-400 hover:text-red-600 text-xs">
            ✕
          </button>
        </div>
      ))}
      {fields.length > 0 && (
        <p className="text-[11px] text-slate-400">Stream ID separates participants on the same recording (e.g. agent 1, customer 0).</p>
      )}
    </div>
  );
}

export function ParticipantForm({ interactionIndex }: Props) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<ManifestFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: `interactions.${interactionIndex}.participants`,
  });

  const iErr =
    errors?.interactions?.[interactionIndex]?.participants;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Participants</h4>
        <button
          type="button"
          onClick={() =>
            append({
              participantType: "AGENT_USER",
              participantIdentifier: "",
              isLeadingAgentUser: false,
              participantMediaReferences: [],
            })
          }
          className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
        >
          + Add participant
        </button>
      </div>

      {typeof iErr?.message === "string" && (
        <p className="text-red-500 text-xs">{iErr.message}</p>
      )}

      {fields.map((field, pi) => {
        const pBase = `interactions.${interactionIndex}.participants.${pi}` as const;
        const pType = watch(`${pBase}.participantType`);
        const pErr = errors?.interactions?.[interactionIndex]?.participants?.[pi];

        return (
          <div key={field.id} className="border rounded p-3 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Participant {pi + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(pi)}
                className="text-red-400 hover:text-red-600 text-xs"
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label required">Type</label>
                <select {...register(`${pBase}.participantType`)} className="input">
                  <option value="AGENT_USER">AGENT_USER</option>
                  <option value="CUSTOMER">CUSTOMER</option>
                  <option value="PARTICIPANT">PARTICIPANT</option>
                </select>
              </div>
              <div>
                <label className="label required">Identifier</label>
                <input
                  {...register(`${pBase}.participantIdentifier`)}
                  className="input"
                  placeholder="agent ID/email, or customer phone number"
                />
                {pErr?.participantIdentifier && (
                  <p className="err">{pErr.participantIdentifier.message}</p>
                )}
              </div>
              <div>
                <label className="label">From <span className="text-slate-400 font-normal">(From or To required)</span></label>
                <input {...register(`${pBase}.participantFrom`)} className="input" placeholder="caller number" />
                {pErr?.participantFrom && <p className="err">{pErr.participantFrom.message}</p>}
              </div>
              <div>
                <label className="label">To <span className="text-slate-400 font-normal">(exactly one)</span></label>
                <input {...register(`${pBase}.participantTo`)} className="input" placeholder="called number" />
              </div>
            </div>

            <Controller
              control={control}
              name={`${pBase}.isLeadingAgentUser`}
              render={({ field: f }) => (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={f.value}
                    onChange={(e) => f.onChange(e.target.checked)}
                    className="rounded"
                  />
                  Leading agent
                </label>
              )}
            />

            <MediaRefs interactionIndex={interactionIndex} participantIndex={pi} />

            {pType === "AGENT_USER" && (
              <div className="border-t pt-2 space-y-2">
                <p className="text-xs font-medium text-slate-600">External identifier — must match an agent configured in CXone (required for AGENT_USER)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label required">System name</label>
                    <input
                      {...register(`${pBase}.externalIdentifier.systemName`)}
                      className="input"
                    />
                    {pErr?.externalIdentifier?.systemName && (
                      <p className="err">{pErr.externalIdentifier.systemName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label required">Identifier type</label>
                    <select
                      {...register(`${pBase}.externalIdentifier.identifierType`)}
                      className="input"
                    >
                      <option value="">Select type</option>
                      <option value="EXTERNAL_IDENTIFIER">EXTERNAL_IDENTIFIER</option>
                      <option value="AGENT_ID">AGENT_ID</option>
                      <option value="EXTENSION">EXTENSION</option>
                    </select>
                  </div>
                  <div>
                    <label className="label required">Value</label>
                    <input
                      {...register(`${pBase}.externalIdentifier.value`)}
                      className="input"
                    />
                  </div>
                </div>
                {pErr?.externalIdentifier && typeof (pErr.externalIdentifier as { message?: string }).message === "string" && (
                  <p className="err">{(pErr.externalIdentifier as { message?: string }).message}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
