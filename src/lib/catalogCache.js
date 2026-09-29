import { base44 } from "@/api/base44Client";

// The public catalog is downloaded by several discovery screens (Home, Search,
// Onboarding, Public Records). Reading the whole collection on each visit is the
// app's heaviest source of entity read traffic, so these helpers read it once and
// share the result for a short window — and collapse simultaneous calls into a
// single request.
const TTL = 5 * 60 * 1000;
const MAX = 5000; // platform cap per request

function makeCache(fetcher, ttl = TTL) {
  let at = 0;
  let has = false;
  let value = null;
  let inflight = null;
  return async () => {
    if (has && Date.now() - at < ttl) return value;
    if (inflight) return inflight;
    inflight = fetcher()
      .then((v) => {
        value = v;
        has = true;
        at = Date.now();
        return v;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };
}

export const getPublishedTracks = makeCache(() =>
  base44.entities.Track
    .filter({ is_published: true }, "-created_date", MAX)
    .catch(() => [])
);

export const getArtists = makeCache(() =>
  base44.entities.Artist.list("-updated_date", MAX).catch(() => [])
);

// The catalog size is counted server-side, but that count pages through every
// track record — the single most expensive call the app makes — so ask for it
// rarely and reuse the answer for a long window.
export const getCatalogCount = makeCache(async () => {
  const res = await base44.functions.invoke("trackCount", {}).catch(() => null);
  const published = res?.data?.published;
  return typeof published === "number" ? published : null;
}, 15 * 60 * 1000);