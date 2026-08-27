import JSZip from "jszip";
import type { InteractionsIngestionManifest } from "../../../src/types/api.ts";
import { normalizeManifest } from "../../../src/utils/zipBuilder.ts";

export async function buildManifestZipBuffer(
  manifest: InteractionsIngestionManifest
): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(normalizeManifest(manifest), null, 2));
  return zip.generateAsync({ type: "nodebuffer" });
}
