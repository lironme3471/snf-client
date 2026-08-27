import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { InputInteraction, Media } from "../../../src/types/api.ts";

export interface ResolvedMedia {
  data: Buffer;
  md5Hex: string;
}

/**
 * Fetches the raw bytes for one declared media item. This is the seam to swap
 * once the real source for media files is known (an API, a bucket, etc.) —
 * everything else in the pipeline only depends on this interface.
 */
export interface MediaResolver {
  resolve(media: Media, interaction: InputInteraction): Promise<ResolvedMedia>;
}

/** Default resolver: looks for `<mediaDir>/<media.fileName>` on local disk. */
export function localDiskResolver(mediaDir: string): MediaResolver {
  return {
    async resolve(media) {
      if (!media.fileName) {
        throw new Error(`Media ${media.mediaId} has no fileName to resolve on disk`);
      }
      const data = await readFile(join(mediaDir, media.fileName));
      return { data, md5Hex: createHash("md5").update(data).digest("hex") };
    },
  };
}
