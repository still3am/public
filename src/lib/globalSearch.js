import { base44 } from "@/api/base44Client";

// Global search runs on the server so the whole catalogue is searchable without
// downloading it: tracks, artists and people are queried in parallel, each
// narrowed by the term the user has typed so far.

const TRACK_LIMIT = 40;
const ARTIST_SCAN = 50; // artist records the server may return per search
const ARTIST_SHOWN = 20; // ranked, de-duplicated artist rows actually surfaced
const COVER_SCAN = 100; // published tracks read to borrow one cover per artist

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contains(field, pattern) {
  return { [field]: { $regex: pattern, $options: "i" } };
}

// Same normalization the Public Record page uses, so a row and the page it
// opens always agree on what counts as the same artist.
function normalizeName(name) {
  return (name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

// Each source is read independently: one failing (rate limit, offline) must not
// blank the others, but the caller still learns whether the main list failed so
// an unreachable search is never reported as "no results".
const read = (promise) =>
  promise
    .then((value) => ({ ok: true, value }))
    .catch(() => ({ ok: false, value: null }));

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

// Name matches outrank bio / location matches, so the artist the user is
// actually typing sits first instead of wherever the record was last touched.
function rankArtist(artist, lower) {
  const name = normalizeName(artist.name);
  if (!name) return 0;
  if (name === lower) return 4;
  if (name.startsWith(lower)) return 3;
  if (name.includes(lower)) return 2;
  return 1; // matched on bio or location only
}

// The catalogue holds several records per artist name (one per upload), so the
// list must collapse to a single row per artist — the most recently updated
// record wins, which is also the one the Public Record page resolves.
function pruneArtists(artists, lower) {
  const byName = new Map();
  for (const artist of artists) {
    const key = normalizeName(artist.name);
    if (key && !byName.has(key)) byName.set(key, artist);
  }
  return [...byName.values()]
    .sort((a, b) => rankArtist(b, lower) - rankArtist(a, lower))
    .slice(0, ARTIST_SHOWN);
}

// Artist records carry no artwork of their own, so each row borrows the album
// cover of that artist's most recent published track — resolved in ONE extra
// query for the whole result page instead of one lookup per artist.
async function artistCovers(names) {
  if (!names.length) return {};
  const res = await read(
    base44.entities.Track.filter(
      {
        is_published: true,
        artist: { $in: names },
        cover_art_url: { $exists: true, $ne: "" },
      },
      {
        sort: "-created_date",
        limit: COVER_SCAN,
        fields: ["artist", "cover_art_url"],
      }
    )
  );
  const map = {};
  for (const t of res.value?.items || []) {
    const key = normalizeName(t.artist);
    if (key && !map[key]) map[key] = t.cover_art_url;
  }
  return map;
}

async function runSearch(query) {
  const Q = query.trim();
  if (!Q) return { tracks: [], artists: [], people: [], failed: false };

  const pattern = escapeRegex(Q);
  const lower = Q.toLowerCase();

  const [trackRes, artistRes, peopleRes] = await Promise.all([
    read(
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
      )
    ),
    read(
      base44.entities.Artist.filter(
        {
          $or: [
            contains("name", pattern),
            contains("bio", pattern),
            contains("location", pattern),
          ],
        },
        { sort: "-updated_date", limit: ARTIST_SCAN }
      )
    ),
    read(base44.functions.invoke("searchUsers", { q: lower })),
  ]);

  const tracks = [...(trackRes.value?.items || [])].sort(
    (a, b) =>
      rank(b, lower) - rank(a, lower) ||
      (b.play_count || 0) - (a.play_count || 0)
  );

  const found = pruneArtists(artistRes.value?.items || [], lower);
  const covers = await artistCovers(found.map((a) => a.name).filter(Boolean));
  const artists = found.map((artist) => ({
    ...artist,
    cover_art_url: artist.cover_art_url || covers[normalizeName(artist.name)] || "",
  }));

  return {
    tracks,
    artists,
    people: peopleRes.value?.data?.results || [],
    failed: !trackRes.ok,
  };
}

// Repeating the same term — backspacing, retyping, or navigating back to the
// search page — must not re-fire this many requests, so an identical term is
// answered from the last few seconds of results and simultaneous calls for the
// same term share one request. A manual refresh passes `fresh` to go to the
// server regardless.
const RECENT_TTL = 20 * 1000;
const recent = new Map();

export function globalSearch(query, { fresh = false } = {}) {
  const Q = query.trim();
  if (!Q) return Promise.resolve({ tracks: [], artists: [], people: [], failed: false });

  const now = Date.now();
  for (const [term, entry] of recent) {
    if (now - entry.at > RECENT_TTL) recent.delete(term);
  }

  if (!fresh) {
    const hit = recent.get(Q);
    if (hit) return hit.promise;
  }

  const promise = runSearch(Q);
  recent.set(Q, { at: now, promise });
  return promise;
}