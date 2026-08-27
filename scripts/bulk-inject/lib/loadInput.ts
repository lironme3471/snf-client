import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import type { CsvRowError } from "../../../src/utils/csvParser.ts";
import { parseCsvToInteractions } from "../../../src/utils/csvParser.ts";
import type { InputInteraction } from "../../../src/types/api.ts";

export interface LoadResult {
  interactions: InputInteraction[];
  errors: CsvRowError[];
}

export async function loadInteractions(inputPath: string): Promise<LoadResult> {
  const raw = await readFile(inputPath, "utf-8");
  const ext = extname(inputPath).toLowerCase();

  if (ext === ".csv") {
    return parseCsvToInteractions(raw);
  }

  if (ext === ".json") {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error(`${inputPath} must contain a JSON array of interactions`);
    }
    return { interactions: parsed as InputInteraction[], errors: [] };
  }

  throw new Error(`Unsupported input file type "${ext}" — use .csv or .json`);
}
