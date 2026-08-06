import JSZip from "jszip";
import type { InteractionsIngestionManifest } from "../types/api";

export async function buildManifestZip(
  manifest: InteractionsIngestionManifest
): Promise<Blob> {
  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}
