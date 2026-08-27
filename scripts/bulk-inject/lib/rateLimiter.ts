function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Serializes async calls with at least `minIntervalMs` between the start of
 * each one. All CXone Store & Forward calls (job creation, status polls,
 * interaction listing) must share a single instance of this, since the
 * account's rate limit is a global budget across the whole API, not just
 * job creation.
 */
export function createRateLimiter(minIntervalMs: number) {
  let nextAvailableAt = 0;
  let queue: Promise<void> = Promise.resolve();

  return function schedule<T>(fn: () => Promise<T>): Promise<T> {
    const turn = queue.then(async () => {
      const wait = Math.max(0, nextAvailableAt - Date.now());
      if (wait > 0) await sleep(wait);
      nextAvailableAt = Date.now() + minIntervalMs;
    });
    queue = turn;
    return turn.then(fn);
  };
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  isRetryable?: (err: unknown) => boolean;
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
}

/** Retries `fn` with exponential backoff + jitter on retryable failures. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    attempts = 5,
    baseDelayMs = 2000,
    isRetryable = () => true,
    onRetry,
  }: RetryOptions = {}
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= attempts || !isRetryable(err)) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1) * (0.75 + Math.random() * 0.5);
      onRetry?.(err, attempt, delay);
      await sleep(delay);
    }
  }
}

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isRetryableHttpError(err: unknown): boolean {
  if (err instanceof HttpError) return err.status === 429 || err.status >= 500;
  // network-level failures (fetch throws a plain Error/TypeError, no .status)
  return err instanceof Error && !(err instanceof HttpError);
}
