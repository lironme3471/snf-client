import { useEffect, useState } from "react";
import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import type { ManifestFormValues } from "../../utils/validation";
import { computeMd5Hex } from "../../utils/sampleMedia";
import { toDatetimeLocal, fromDatetimeLocal } from "../../utils/datetime";

interface Props {
  interactionIndex: number;
  onMediaBlob: (mediaId: string, blob: Blob) => void;
}

const BINARY_TYPES = ["AUDIO", "SCREEN", "ATTACHMENT"];

function MediaItem({
  interactionIndex,
  mediaIndex,
  onRemove,
  onMediaBlob,
}: {
  interactionIndex: number;
  mediaIndex: number;
  onRemove: () => void;
  onMediaBlob: (mediaId: string, blob: Blob) => void;
}) {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ManifestFormValues>();
  const [file, setFile] = useState<File | null>(null);
  const [hashing, setHashing] = useState(false);

  const iBase = `interactions.${interactionIndex}` as const;
  const mBase = `${iBase}.media.${mediaIndex}` as const;
  const mType = watch(`${mBase}.mediaType`);
  const mediaId = watch(`${mBase}.mediaId`);
  const mErr = errors?.interactions?.[interactionIndex]?.media?.[mediaIndex];
  const isBinary = BINARY_TYPES.includes(mType);

  // keep the uploaded blob keyed by the current media ID, even if the ID is edited
  useEffect(() => {
    if (file && mediaId) onMediaBlob(mediaId, file);
  }, [file, mediaId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFile(f: File | undefined) {
    if (!f) return;
    setHashing(true);
    try {
      const ext = f.name.includes(".") ? f.name.split(".").pop()!.toUpperCase() : "";
      const opts = { shouldValidate: true, shouldDirty: true };
      if (!mediaId) setValue(`${mBase}.mediaId`, `${mType}-${Date.now()}`, opts);
      setValue(`${mBase}.fileName`, f.name, opts);
      setValue(`${mBase}.fileType`, ext, opts);
      setValue(`${mBase}.checksum`, { algorithm: "MD5", value: await computeMd5Hex(f) }, opts);
      // default the media window to the interaction window
      if (!watch(`${mBase}.startTime`)) setValue(`${mBase}.startTime`, watch(`${iBase}.startTime`), opts);
      if (!watch(`${mBase}.endTime`)) setValue(`${mBase}.endTime`, watch(`${iBase}.endTime`), opts);
      setFile(f);
    } finally {
      setHashing(false);
    }
  }

  const timeField = (name: "startTime" | "endTime", label: string) => (
    <div>
      <label className="label required">{label}</label>
      <Controller
        control={control}
        name={`${mBase}.${name}`}
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
      {mErr?.[name] && <p className="err">{mErr[name]!.message}</p>}
    </div>
  );

  return (
    <div className="border rounded p-3 bg-slate-50 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">Media {mediaIndex + 1}</span>
        <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600 text-xs">
          Remove
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label required">Media ID</label>
          <input {...register(`${mBase}.mediaId`)} className="input" />
          <p className="text-[11px] text-slate-400 mt-0.5">Your unique ID; participants reference it.</p>
          {mErr?.mediaId && <p className="err">{mErr.mediaId.message}</p>}
        </div>
        <div>
          <label className="label required">Media type</label>
          <select {...register(`${mBase}.mediaType`)} className="input">
            <option value="TEXT">TEXT</option>
            <option value="AUDIO">AUDIO</option>
            <option value="SCREEN">SCREEN</option>
            <option value="ATTACHMENT">ATTACHMENT</option>
          </select>
        </div>
        {timeField("startTime", "Start time")}
        {timeField("endTime", "End time")}
      </div>

      {mType === "TEXT" && (
        <div>
          <label className="label required">Content</label>
          <textarea
            {...register(`${mBase}.content`)}
            rows={3}
            className="input resize-none"
            placeholder="Inline text content (max 256 characters)"
          />
          {mErr?.content && <p className="err">{mErr.content.message}</p>}
        </div>
      )}

      {isBinary && (
        <div className="space-y-2 border-t pt-2">
          <div>
            <label className="label required">File</label>
            <input
              type="file"
              accept={mType === "AUDIO" ? "audio/*,.wav,.mp3" : mType === "SCREEN" ? "video/*,.mp4" : undefined}
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="block text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">
              {hashing
                ? "Calculating checksum…"
                : file
                  ? "Will be uploaded automatically after the job is created."
                  : "Picking a file fills file name, type and MD5 checksum for you."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label required">File name</label>
              <input {...register(`${mBase}.fileName`)} className="input" placeholder="e.g. recording.wav" />
              {mErr?.fileName && <p className="err">{mErr.fileName.message}</p>}
            </div>
            <div>
              <label className="label">File type</label>
              <input {...register(`${mBase}.fileType`)} className="input" placeholder="e.g. WAV" />
            </div>
            <div>
              <label className="label required">Checksum algorithm</label>
              <input {...register(`${mBase}.checksum.algorithm`)} className="input" placeholder="MD5" />
              {mErr?.checksum?.algorithm && <p className="err">{mErr.checksum.algorithm.message}</p>}
            </div>
            <div>
              <label className="label required">Checksum value</label>
              <input {...register(`${mBase}.checksum.value`)} className="input" placeholder="base64 MD5" />
              {mErr?.checksum?.value && <p className="err">{mErr.checksum.value.message}</p>}
            </div>
          </div>
          {mErr?.checksum && typeof (mErr.checksum as { message?: string }).message === "string" && (
            <p className="err">{(mErr.checksum as { message?: string }).message}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function MediaForm({ interactionIndex, onMediaBlob }: Props) {
  const { control } = useFormContext<ManifestFormValues>();
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
            append({ mediaId: `AUDIO-${Date.now()}`, mediaType: "AUDIO", startTime: "", endTime: "" })
          }
          className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
        >
          + Add media
        </button>
      </div>

      {fields.map((field, mi) => (
        <MediaItem
          key={field.id}
          interactionIndex={interactionIndex}
          mediaIndex={mi}
          onRemove={() => remove(mi)}
          onMediaBlob={onMediaBlob}
        />
      ))}
    </div>
  );
}
