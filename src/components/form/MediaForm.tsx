import { useFormContext, useFieldArray } from "react-hook-form";
import type { ManifestFormValues } from "../../utils/validation";

interface Props {
  interactionIndex: number;
}

export function MediaForm({ interactionIndex }: Props) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<ManifestFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: `interactions.${interactionIndex}.media`,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Media</h4>
        <button
          type="button"
          onClick={() =>
            append({
              mediaId: "",
              mediaType: "TEXT",
              startTime: "",
              endTime: "",
            })
          }
          className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
        >
          + Add media
        </button>
      </div>

      {fields.map((field, mi) => {
        const mBase = `interactions.${interactionIndex}.media.${mi}` as const;
        const mType = watch(`${mBase}.mediaType`);
        const mErr = errors?.interactions?.[interactionIndex]?.media?.[mi];
        const isBinary =
          mType === "AUDIO" || mType === "SCREEN" || mType === "ATTACHMENT";

        return (
          <div key={field.id} className="border rounded p-3 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Media {mi + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(mi)}
                className="text-red-400 hover:text-red-600 text-xs"
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Media ID</label>
                <input {...register(`${mBase}.mediaId`)} className="input" />
                {mErr?.mediaId && <p className="err">{mErr.mediaId.message}</p>}
              </div>
              <div>
                <label className="label">Media type</label>
                <select {...register(`${mBase}.mediaType`)} className="input">
                  <option value="TEXT">TEXT</option>
                  <option value="AUDIO">AUDIO</option>
                  <option value="SCREEN">SCREEN</option>
                  <option value="ATTACHMENT">ATTACHMENT</option>
                </select>
              </div>
              <div>
                <label className="label">Start time</label>
                <input
                  type="datetime-local"
                  step="1"
                  {...register(`${mBase}.startTime`)}
                  className="input"
                />
                {mErr?.startTime && <p className="err">{mErr.startTime.message}</p>}
              </div>
              <div>
                <label className="label">End time</label>
                <input
                  type="datetime-local"
                  step="1"
                  {...register(`${mBase}.endTime`)}
                  className="input"
                />
                {mErr?.endTime && <p className="err">{mErr.endTime.message}</p>}
              </div>
            </div>

            {mType === "TEXT" && (
              <div>
                <label className="label">Content</label>
                <textarea
                  {...register(`${mBase}.content`)}
                  rows={3}
                  className="input resize-none"
                  placeholder="Inline text content"
                />
                {mErr?.content && <p className="err">{mErr.content.message}</p>}
              </div>
            )}

            {isBinary && (
              <div className="space-y-2 border-t pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">File name</label>
                    <input {...register(`${mBase}.fileName`)} className="input" placeholder="e.g. recording.wav" />
                    {mErr?.fileName && <p className="err">{mErr.fileName.message}</p>}
                  </div>
                  <div>
                    <label className="label">File type</label>
                    <input {...register(`${mBase}.fileType`)} className="input" placeholder="e.g. audio/wav" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Checksum algorithm</label>
                    <input
                      {...register(`${mBase}.checksum.algorithm`)}
                      className="input"
                      placeholder="e.g. MD5"
                    />
                    {mErr?.checksum?.algorithm && (
                      <p className="err">{mErr.checksum.algorithm.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Checksum value</label>
                    <input
                      {...register(`${mBase}.checksum.value`)}
                      className="input"
                      placeholder="hex / base64"
                    />
                    {mErr?.checksum?.value && (
                      <p className="err">{mErr.checksum.value.message}</p>
                    )}
                  </div>
                </div>
                {mErr?.checksum && typeof (mErr.checksum as { message?: string }).message === "string" && (
                  <p className="err">{(mErr.checksum as { message?: string }).message}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
