import { base44 } from "@/api/base44Client";

// Surfaces like the follower list and the notifications feed need details for
// many users at once. Firing one request per id burst the API and tripped the
// platform rate limit, so results are cached for the session, identical ids
// share a single in-flight request, and requests go out a few at a time.
const cache = new Map();
const inflight = new Map();
const CONCURRENCY = 3;

function fetchOne(id) {
  if (cache.has(id)) return Promise.resolve(cache.get(id));
  if (inflight.has(id)) return inflight.get(id);
  const req = base44.entities.User.get(id)
    .then((user) => {
      if (user) cache.set(id, user);
      return user || null;
    })
    .catch(() => null)
    .finally(() => inflight.delete(id));
  inflight.set(id, req);
  return req;
}

/**
 * Resolve user details for a list of ids, preserving input order.
 * Unknown/blocked users are simply omitted.
 */
export async function getUsersByIds(ids = []) {
  const unique = [...new Set((ids || []).filter(Boolean))];
  const users = [];
  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const batch = unique.slice(i, i + CONCURRENCY);
    const found = await Promise.all(batch.map(fetchOne));
    found.forEach((u) => {
      if (u) users.push(u);
    });
  }
  return users;
}

export function getCachedUser(id) {
  return cache.get(id) || null;
}