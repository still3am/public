import { base44 } from "@/api/base44Client";
import { makeCache } from "@/lib/cachedQuery";

// The public catalog is downloaded by several discovery screens (Home, Search,
// Public Records, profile pickers). Reading the whole collection on each visit
// is the app's heaviest source of entity read traffic, so these helpers read it
// once and share the result for a short window — and collapse simultaneous calls
// into a single request.
const MAX = 5000; // platform cap per request
const WINDOW = { ttl: 10 * 60 * 1000, retryAfterError: 30 * 1000 };

export const getPublishedTracks = makeCache(
  () => base44.entities.Track.filter({ is_published: true }, "-created_date", MAX),
  WINDOW
);

export const getArtists = makeCache(
  () => base44.entities.Artist.list("-updated_date", MAX),
  WINDOW
);

// The catalog size is counted server-side (and shared app-wide for an hour), but
// still reuse the answer here for a while so navigating back and forth is free.
export const getCatalogCount = makeCache(
  async () => {
    const res = await base44.functions.invoke("trackCount", {});
    const published = res?.data?.published;
    return typeof published === "number" ? published : null;
  },
  { ttl: 15 * 60 * 1000, retryAfterError: 30 * 1000, fallback: null }
);