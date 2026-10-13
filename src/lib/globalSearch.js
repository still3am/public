import { base44 } from "@/api/base44Client";
import { splitArtistNames } from "@/lib/artistTracks";

// Global search runs on the server so the whole catalogue is searchable without
// downloading it: tracks, artists and people are queried in parallel, each
// narrowed by the term the user has typed so far.

const rows = value => Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : [];
const TRACK_LIMIT = 40;
const PLAYLIST_LIMIT = 20; // public playlists the server returns per search
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

// Playlists rank on their own name: one that starts with the term sits above one
// that only mentions it further along.
function rankPlaylist(playlist, lower) {
  const name = (playlist.name || "").toLowerCase();
  return name.startsWith(lower) ? 2 : 1;
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

function creditPattern(name) {
  // Bounded by anything that is not a letter or digit, so "Yeat" matches the
  // credit inside "Yeat, Drake" but never the "yeat" inside "Yeats".
  return `(^|[^a-z0-9])${escapeRegex(name)}([^a-z0-9]|$)`;
}

// Artist records carry no artwork of their own, so each row borrows the cover of
// that artist's most recent published track. Two things have to hold for that to
// work: a track's artist tag often lists several credits at once ("Yeat, Drake"),
// so the match is made against each credited name, and the query is narrowed on
// the server to the artists actually on screen instead of scanning whichever
// covers happen to be newest — which left every older artist without an image.
async function artistCovers(names) {
  const wanted = new Set(names.flatMap(splitArtistNames));
  if (!wanted.size) return new Map();

  const res = await read(
    base44.entities.Track.filter(
      {
        is_published: true,
        cover_art_url: { $exists: true, $ne: "" },
        $or: [...wanted].map((name) => ({
          artist: { $regex: creditPattern(name), $options: "i" },
        })),
      },
      {
        sort: "-created_date",
        limit: COVER_SCAN,
        fields: ["artist", "cover_art_url"],
      }
    )
  );

  const map = new Map();
  for (const track of rows(res.value)) {
    for (const credit of splitArtistNames(track.artist)) {
      if (wanted.has(credit) && !map.has(credit)) map.set(credit, track.cover_art_url);
    }
  }
  return map;
}

// An artist record may itself be a combined credit, so its row takes the cover
// of whichever of its credited names has one.
function coverFor(artist, covers) {
  return splitArtistNames(artist.name).map((n) => covers.get(n)).find(Boolean) || "";
}

async function runSearch(query) {
  const Q = query.trim();
  if (!Q) return { tracks: [], artists: [], people: [], playlists: [], failed: false };

  const pattern = escapeRegex(Q);
  const lower = Q.toLowerCase();

  const [trackRes, artistRes, peopleRes, playlistRes] = await Promise.all([
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
    read(
      base44.entities.Playlist.filter(
        // A playlist belongs in the results only when the term matches the
        // playlist itself — a description that happens to mention the term is not
        // a search for that playlist.
        { is_public: true, ...contains("name", pattern) },
        { sort: "-created_date", limit: PLAYLIST_LIMIT }
      )
    ),
  ]);

  const tracks = [...(rows(trackRes.value))].sort(
    (a, b) =>
      rank(b, lower) - rank(a, lower) ||
      (b.play_count || 0) - (a.play_count || 0)
  );

  const found = pruneArtists(rows(artistRes.value), lower);
  const covers = await artistCovers(found.map((a) => a.name).filter(Boolean));
  const artists = found.map((artist) => ({
    ...artist,
    cover_art_url:
      artist.cover_art_url || artist.avatar_url || coverFor(artist, covers),
  }));

  const playlists = [...(rows(playlistRes.value))].sort(
    (a, b) => rankPlaylist(b, lower) - rankPlaylist(a, lower)
  );

  return {
    tracks,
    artists,
    people: peopleRes.value?.data?.results || [],
    playlists,
    failed: !trackRes.ok,
    peopleFailed: !peopleRes.ok,
  };
}

// Repeating the same term — backspacing, retyping, or navigating back to the
// search page — must not re-fire this many requests, so an identical term is
// answered from the last few seconds of results and simultaneous calls for the
// same term share one request. A manual refresh passes `fresh` to go to the
// server regardless.
const RECENT_TTL = 20 * 1000;
const recent = new Map();
window.addEventListener("catalog:invalidate",()=>recent.clear());
window.addEventListener("account:cleared",()=>recent.clear());

export function globalSearch(query, { fresh = false } = {}) {
  const Q = query.trim();
  if (!Q)
    return Promise.resolve({
      tracks: [],
      artists: [],
      people: [],
      playlists: [],
      failed: false,
    });

  const now = Date.now();
  for (const [term, entry] of recent) {
    if (now - entry.at > RECENT_TTL) recent.delete(term);
  }

  if (!fresh) {
    const hit = recent.get(Q);
    if (hit) return hit.promise;
  }

  const promise = runSearch(Q).then(result=>{if(result.failed||result.peopleFailed)recent.delete(Q);return result;}).catch(error=>{recent.delete(Q);throw error;});
  recent.set(Q, { at: now, promise });
  return promise;
}