export async function runWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const effectiveLimit = Math.max(1, Math.min(limit, items.length));
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = cursor;

      cursor += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from({ length: effectiveLimit }, () => worker());

  await Promise.all(workers);

  return results;
}
