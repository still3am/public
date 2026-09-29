import { base44 } from "@/api/base44Client";

// Surfaces like the follower list and the notifications feed need details for
// many users at once. Firing one request per id burst the API and tripped the
// platform rate limit, so ids are resolved in a single batched request, cached
// for the session, and identical batches share one in-flight request.
const cache = new Map();
const inflight = new Map();
const CHUNK = 100;

function fetchChunk(ids) {
  const key = ids.join(",");
  if (inflight.has(key)) return inflight.get(key);
  const req = base44.functions
    .invoke("usersByIds", { ids })
    .then((res) => res?.data?.users || [])
    .catch(() => [])
    .finally(() => inflight.delete(key));
  inflight.set(key, req);
  return req;
}

/**
 * Resolve user details for a list of ids, preserving input order.
 * Unknown/blocked users are simply omitted.
 */
export async function getUsersByIds(ids = []) {
  const unique = [...new Set((ids || []).filter(Boolean))];
  const missing = unique.filter((id) => !cache.has(id));
  for (let i = 0; i < missing.length; i += CHUNK) {
    const users = await fetchChunk(missing.slice(i, i + CHUNK));
    users.forEach((u) => {
      if (u?.id) cache.set(u.id, u);
    });
  }
  return unique.map((id) => cache.get(id)).filter(Boolean);
}

export function getCachedUser(id) {
  return cache.get(id) || null;
}