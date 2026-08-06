/** Generates a minimal valid PCM WAV (0.5 s silence, 8 kHz, 8-bit mono). */
export function generateWavBlob(): Blob {
  const sampleRate = 8000;
  const numSamples = sampleRate / 2; // 0.5 s
  const dataSize = numSamples; // 1 byte per sample (8-bit)
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeStr(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }
  function writeU32(offset: number, v: number) { view.setUint32(offset, v, true); }
  function writeU16(offset: number, v: number) { view.setUint16(offset, v, true); }

  writeStr(0, "RIFF");
  writeU32(4, 36 + dataSize);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  writeU32(16, 16);       // chunk size
  writeU16(20, 1);        // PCM
  writeU16(22, 1);        // mono
  writeU32(24, sampleRate);
  writeU32(28, sampleRate); // byte rate
  writeU16(32, 1);        // block align
  writeU16(34, 8);        // bits per sample
  writeStr(36, "data");
  writeU32(40, dataSize);
  // silence = 0x80 for unsigned 8-bit PCM
  new Uint8Array(buffer, 44).fill(0x80);

  return new Blob([buffer], { type: "audio/wav" });
}

// Minimal 1×1 white pixel PNG (hardcoded — 67 bytes)
const PNG_BYTES = Uint8Array.from(atob(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg=="
), (c) => c.charCodeAt(0));

export function samplePngBlob(): Blob {
  return new Blob([PNG_BYTES], { type: "image/png" });
}

export async function computeSha256Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
