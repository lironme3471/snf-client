/** Runs `worker` over `items` with at most `concurrency` in flight at once. */
export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;

  async function next(): Promise<void> {
    const i = index++;
    if (i >= items.length) return;
    await worker(items[i]);
    return next();
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
}
