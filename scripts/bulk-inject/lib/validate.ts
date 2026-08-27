import type { InputInteraction } from "../../../src/types/api.ts";
import type { CsvRowError } from "../../../src/utils/csvParser.ts";

/** Dataset-wide checks that a single-row validator can't catch (e.g. duplicates across the whole file). */
export function validateDataset(interactions: InputInteraction[]): CsvRowError[] {
  const errors: CsvRowError[] = [];
  const seen = new Map<string, number>();

  interactions.forEach((interaction, index) => {
    const id = interaction.externalInteractionId;
    const firstIndex = seen.get(id);
    if (firstIndex !== undefined) {
      errors.push({
        row: index,
        column: "externalInteractionId",
        message: `Duplicate externalInteractionId "${id}" (first seen at index ${firstIndex})`,
      });
    } else {
      seen.set(id, index);
    }
  });

  return errors;
}
