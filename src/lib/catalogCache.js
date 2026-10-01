import { base44 } from "@/api/base44Client";

// The public catalog is downloaded by several discovery screens (Home, Search,
// Public Records). Reading the whole collection on each visit is the
// app's heaviest source of entity read traffic, so these helpers read it once and
// share the result for a short window — and collapse simultaneous calls into a
// single request.
const TTL = 10 * 60 * 1000;
const RETRY_AFTER_ERROR = 30 * 1000;
const MAX = 5000; // platform cap per request

function makeCache(fetcher, ttl = TTL) {
  let hasValue = false;
  let value = null;
  let expiresAt = 0;
  let inflight = null;
  return async () => {
    if (hasValue && Date.now() < expiresAt) return value;
    if (inflight) return inflight;
    inflight = fetcher()
      .then((v) => {
        value = v;
        hasValue = true;
        expiresAt = Date.now() + ttl;
        return v;
      })
      .catch(() => {
        // A failed read (rate limit, offline) must never be cached as the new
        // truth — that would blank the catalog for the whole window. Keep
        // serving the last good value and allow a retry shortly after.
        expiresAt = Date.now() + RETRY_AFTER_ERROR;
        return hasValue ? value : [];
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };
}

export const getPublishedTracks = makeCache(() =>
  base44.entities.Track.filter({ is_published: true }, "-created_date", MAX)
);

export const getArtists = makeCache(() =>
  base44.entities.Artist.list("-updated_date", MAX)
);

// The catalog size is counted server-side (and shared app-wide for an hour), but
// still reuse the answer here for a while so navigating back and forth is free.
export const getCatalogCount = makeCache(async () => {
  const res = await base44.functions.invoke("trackCount", {});
  const published = res?.data?.published;
  return typeof published === "number" ? published : null;
}, 15 * 60 * 1000);