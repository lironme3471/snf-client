import type { InputInteraction } from "../../../src/types/api.ts";
import type { BatchCheckpoint } from "./checkpoint.ts";
import { runWithConcurrency } from "./concurrency.ts";
import type { MediaResolver } from "./mediaResolver.ts";
import { uploadMedia } from "./niceApi.ts";
import { isRetryableHttpError, withRetry } from "./rateLimiter.ts";

/**
 * Uploads every media file declared for a batch's presigned URLs. Not
 * NICE-rate-limited (it's S3, not the CXone API), so this uses its own small
 * concurrency pool instead of the shared API rate limiter.
 *
 * Throws if any upload fails, after recording per-mediaId status on the
 * batch checkpoint so a retry only re-attempts what didn't finish.
 */
export async function uploadBatchMedia(
  batch: BatchCheckpoint,
  interactions: InputInteraction[],
  resolver: MediaResolver,
  concurrency: number
): Promise<void> {
  const pending = (batch.mediaUploadUrls ?? []).filter(
    (url) => url.mediaId && batch.mediaUploads[url.mediaId] !== "done"
  );

  await runWithConcurrency(pending, concurrency, async (url) => {
    const mediaId = url.mediaId!;
    try {
      if (url.uploadUrlExpiresAt && Date.parse(url.uploadUrlExpiresAt) < Date.now()) {
        throw new Error("presigned upload URL expired before it could be used");
      }

      const interaction = interactions.find((i) => i.media.some((m) => m.mediaId === mediaId));
      const media = interaction?.media.find((m) => m.mediaId === mediaId);
      if (!interaction || !media) {
        throw new Error(`No source interaction/media entry found for mediaId ${mediaId}`);
      }

      const resolved = await resolver.resolve(media, interaction);
      await withRetry(
        () => uploadMedia(url.uploadUrl, url.httpMethod, url.headers, resolved.data),
        { attempts: 3, baseDelayMs: 1000, isRetryable: isRetryableHttpError }
      );
      batch.mediaUploads[mediaId] = "done";
    } catch (err) {
      batch.mediaUploads[mediaId] = "failed";
      throw err;
    }
  });

  const failed = Object.entries(batch.mediaUploads).filter(([, status]) => status === "failed");
  if (failed.length > 0) {
    throw new Error(`${failed.length} media upload(s) failed: ${failed.map(([id]) => id).join(", ")}`);
  }
}
