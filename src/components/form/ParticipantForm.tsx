import {
  useFormContext,
  useFieldArray,
  Controller,
} from "react-hook-form";
import type { ManifestFormValues } from "../../utils/validation";

interface Props {
  interactionIndex: number;
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
                <label className="label">Type</label>
                <select {...register(`${pBase}.participantType`)} className="input">
                  <option value="AGENT_USER">AGENT_USER</option>
                  <option value="CUSTOMER">CUSTOMER</option>
                  <option value="PARTICIPANT">PARTICIPANT</option>
                </select>
              </div>
              <div>
                <label className="label">Identifier</label>
                <input
                  {...register(`${pBase}.participantIdentifier`)}
                  className="input"
                  placeholder="e.g. agent@company.com"
                />
                {pErr?.participantIdentifier && (
                  <p className="err">{pErr.participantIdentifier.message}</p>
                )}
              </div>
              <div>
                <label className="label">From</label>
                <input {...register(`${pBase}.participantFrom`)} className="input" placeholder="optional" />
              </div>
              <div>
                <label className="label">To</label>
                <input {...register(`${pBase}.participantTo`)} className="input" placeholder="optional" />
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

            {pType === "AGENT_USER" && (
              <div className="border-t pt-2 space-y-2">
                <p className="text-xs font-medium text-slate-600">External Identifier (required for AGENT_USER)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label">System name</label>
                    <input
                      {...register(`${pBase}.externalIdentifier.systemName`)}
                      className="input"
                    />
                    {pErr?.externalIdentifier?.systemName && (
                      <p className="err">{pErr.externalIdentifier.systemName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Identifier type</label>
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
                    <label className="label">Value</label>
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
