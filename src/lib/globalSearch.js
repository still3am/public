import { base44 } from "@/api/base44Client";

// Global search runs on the server so the whole catalogue is searchable without
// downloading it: tracks, artists and people are queried in parallel, each
// narrowed by the term the user has typed so far.

const TRACK_LIMIT = 40;
const ARTIST_LIMIT = 50;

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contains(field, pattern) {
  return { [field]: { $regex: pattern, $options: "i" } };
}

// One source failing (rate limit, offline) must not blank the other two.
const safe = (promise, fallback) => promise.catch(() => fallback);

// The server narrows the results; inside that page we rank the closest matches
// first so suggestions feel right while the user is still typing.
function rank(track, lower) {
  const title = (track.title || "").toLowerCase();
  const artist = (track.artist || track.uploader_name || "").toLowerCase();
  if (title.startsWith(lower)) return 4;
  if (title.includes(lower)) return 3;
  if (artist.startsWith(lower)) return 2;
  if (artist.includes(lower)) return 1;
  return 0;
}

export async function globalSearch(query) {
  const Q = query.trim();
  if (!Q) return { tracks: [], artists: [], people: [] };

  const pattern = escapeRegex(Q);
  const lower = Q.toLowerCase();

  const [trackPage, artistPage, peopleRes] = await Promise.all([
    safe(
      base44.entities.Track.filter(
        {
          is_published: true,
          $or: [
            contains("title", pattern),
            contains("artist", pattern),
            contains("uploader_name", pattern),
          ],
        },
        { sort: "-play_count", limit: TRACK_LIMIT }
      ),
      { items: [] }
    ),
    safe(
      base44.entities.Artist.filter(
        {
          $or: [
            contains("name", pattern),
            contains("bio", pattern),
            contains("location", pattern),
          ],
        },
        { sort: "-updated_date", limit: ARTIST_LIMIT }
      ),
      { items: [] }
    ),
    safe(base44.functions.invoke("searchUsers", { q: lower }), null),
  ]);

  const tracks = [...(trackPage?.items || [])].sort(
    (a, b) =>
      rank(b, lower) - rank(a, lower) ||
      (b.play_count || 0) - (a.play_count || 0)
  );

  return {
    tracks,
    artists: artistPage?.items || [],
    people: peopleRes?.data?.results || [],
  };
}