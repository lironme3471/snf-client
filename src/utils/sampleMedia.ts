/** Generates a minimal valid PCM WAV (0.5 s silence, 8 kHz, 16-bit signed mono). */
export function generateWavBlob(): Blob {
  const sampleRate = 8000;
  const numSamples = sampleRate / 2; // 0.5 s
  const dataSize = numSamples * 2;   // 2 bytes per sample (16-bit)
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
  writeU32(16, 16);           // chunk size
  writeU16(20, 1);            // PCM
  writeU16(22, 1);            // mono
  writeU32(24, sampleRate);
  writeU32(28, sampleRate * 2); // byte rate (sampleRate * blockAlign)
  writeU16(32, 2);            // block align (2 bytes per sample)
  writeU16(34, 16);           // bits per sample (16-bit signed)
  writeStr(36, "data");
  writeU32(40, dataSize);
  // silence = 0x0000 for signed 16-bit PCM (already zero-initialized)

  return new Blob([buffer], { type: "audio/wav" });
}

// Minimal valid MP4: ftyp(isom) + empty mdat box (28 bytes)
const MP4_BYTES = Uint8Array.from([
  0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, // ftyp size=20
  0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x00, 0x00, // brand=isom, version=0
  0x69, 0x73, 0x6F, 0x6D,                           // compatible: isom
  0x00, 0x00, 0x00, 0x08, 0x6D, 0x64, 0x61, 0x74  // mdat size=8
]);

export function sampleMp4Blob(): Blob {
  return new Blob([MP4_BYTES], { type: "video/mp4" });
}

export async function computeSha256Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeMd5Hex(blob: Blob): Promise<string> {
  // Use crypto-js for MD5 computation (required by NICE API)
  // API expects base64-encoded MD5 hash
  const CryptoJS = await import("crypto-js");
  const buf = await blob.arrayBuffer();
  const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(buf));
  return CryptoJS.MD5(wordArray).toString(CryptoJS.enc.Base64);
}
