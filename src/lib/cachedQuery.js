// Entity reads are the app's scarcest resource: the platform rate-limits how
// many requests an app may make in a window, and bursts (several screens reading
// the same collection, or a realtime event storm) trip that limit.
//
// makeCache gives every shared read a cached copy per argument set, collapses
// simultaneous identical calls into a single request, and keeps serving the last
// good value while a rate-limited read backs off instead of surfacing an error
// to the user.

const RATE_LIMIT = /rate limit/i;

export function isRateLimitError(error) {
  return RATE_LIMIT.test(String(error?.message || error || ""));
}

export async function withRetry(fn, { retries = 3, baseDelayMs = 800 } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries || !isRateLimitError(error)) throw error;
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }
}

/**
 * @param {Function} fetcher  performs the actual read
 * @param {object}   options
 *   ttl              how long a successful read stays fresh
 *   retryAfterError  how long to wait before retrying a failed read
 *   fallback         value returned when a read fails and nothing is cached
 *   max              how many different argument sets to remember
 */
export function makeCache(
  fetcher,
  { ttl = 60000, retryAfterError = 20000, fallback = [], max = 60 } = {}
) {
  const entries = new Map(); // key -> { value, expiresAt }
  const inflight = new Map();

  const run = async (args, force) => {
    const key = JSON.stringify(args);
    const entry = entries.get(key);
    if (!force && entry && Date.now() < entry.expiresAt) return entry.value;
    if (inflight.has(key)) return inflight.get(key);

    const request = withRetry(() => fetcher(...args))
      .then((result) => {
        if (entries.size >= max && !entries.has(key)) {
          entries.delete(entries.keys().next().value);
        }
        entries.delete(key);
        entries.set(key, { value: result, expiresAt: Date.now() + ttl });
        return result;
      })
      .catch(() => {
        // A failed read must never be cached as the new truth — keep the last
        // good value and allow another attempt shortly after.
        if (entry) {
          entry.expiresAt = Date.now() + retryAfterError;
          return entry.value;
        }
        return fallback;
      })
      .finally(() => inflight.delete(key));

    inflight.set(key, request);
    return request;
  };

  const cached = (...args) => run(args, false);
  cached.refresh = (...args) => run(args, true);
  cached.invalidate = () => entries.clear();
  return cached;
}