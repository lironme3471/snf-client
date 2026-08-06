import { useFormContext, useFieldArray } from "react-hook-form";
import type { ManifestFormValues } from "../../utils/validation";

interface Props {
  interactionIndex: number;
}

export function BusinessDataForm({ interactionIndex }: Props) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ManifestFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: `interactions.${interactionIndex}.businessData`,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Business Data</h4>
        <button
          type="button"
          onClick={() => append({ key: "", value: "" })}
          className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
        >
          + Add field
        </button>
      </div>
      {fields.map((field, bi) => {
        const bErr = errors?.interactions?.[interactionIndex]?.businessData?.[bi];
        return (
          <div key={field.id} className="flex gap-2 items-start">
            <div className="flex-1">
              <input
                {...register(`interactions.${interactionIndex}.businessData.${bi}.key`)}
                className="input"
                placeholder="Key (must be pre-defined in CXone)"
              />
              {bErr?.key && <p className="err">{bErr.key.message}</p>}
            </div>
            <div className="flex-1">
              <input
                {...register(`interactions.${interactionIndex}.businessData.${bi}.value`)}
                className="input"
                placeholder="Value"
              />
              {bErr?.value && <p className="err">{bErr.value.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => remove(bi)}
              className="text-red-400 hover:text-red-600 text-xs mt-2"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
