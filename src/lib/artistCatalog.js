import { base44 } from "@/api/base44Client";
import { getPublishedTracks } from "@/lib/catalogCache";

// ONE source of truth for "which tracks belong to which artist".
//
// An artist credit is stored on the track as a single string
// ("Maluma, Beéle, Rauw Alejandro feat. X"). Every screen that asks about an
// artist — the artist's Public Record, "More from", search counts, autoplay —
// must read that relationship the same way, so splitting and matching live here
// and nowhere else.

const SEPARATORS = /\s*(?:,|&|\bfeat\.?|\bft\.?|\bwith\b|\bx\b|\bvs\.?|;|\/|\+)\s*/i;

export function splitArtistNames(value) {
  return String(value || "")
    .split(SEPARATORS)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Accent- and punctuation-insensitive so "Beéle", "Beele" and "BEÉLE " are one
// artist, while different artists never collide.
export function normalizeArtistName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// True when `name` is one of the artists credited on the track — first-listed
// (primary), featured, or part of a collaboration.
export function trackHasArtist(track, name) {
  const target = normalizeArtistName(name);
  if (!target) return false;
  return splitArtistNames(track?.artist).some(
    (credited) => normalizeArtistName(credited) === target
  );
}

export function primaryArtistName(track) {
  return (
    splitArtistNames(track?.artist)[0] ||
    track?.artist ||
    track?.uploader_name ||
    ""
  );
}

const CACHE_TTL = 5 * 60 * 1000;
const PAGE = 500;
const cache = new Map();

/**
 * Every published track credited to `name`.
 *
 * Reads the relationship straight from the backend — the collection is filtered
 * and paged server-side — so an artist page is never limited to whatever slice
 * of the catalog one page load happened to hold. Falls back to the shared
 * catalog read only when the filtered query comes back empty.
 */
export async function fetchArtistTracks(name) {
  const key = normalizeArtistName(name);
  if (!key) return [];

  const hit = cache.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.value;

  let rows = [];
  try {
    for (let skip = 0; skip < 20000; skip += PAGE) {
      const page = await base44.entities.Track.filter(
        { is_published: true, artist: name },
        "-play_count",
        PAGE,
        skip
      );
      if (!Array.isArray(page) || page.length === 0) break;
      rows = rows.concat(page);
      if (page.length < PAGE) break;
    }
  } catch {
    rows = [];
  }

  let matched = rows.filter((t) => trackHasArtist(t, name));

  if (matched.length === 0) {
    // Different punctuation/accents than the stored credit — scan the already
    // shared catalog copy rather than showing an empty artist page.
    const all = await getPublishedTracks().catch(() => []);
    matched = (Array.isArray(all) ? all : []).filter((t) => trackHasArtist(t, name));
  }

  matched.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
  cache.set(key, { value: matched, expiresAt: Date.now() + CACHE_TTL });
  return matched;
}

/** Groups tracks into releases. Only real album links are used — no guessing. */
export function groupAlbums(tracks) {
  const map = new Map();
  for (const t of tracks || []) {
    if (!t?.album_id) continue;
    if (!map.has(t.album_id)) {
      map.set(t.album_id, {
        id: t.album_id,
        cover: t.cover_art_url || "",
        tracks: [],
      });
    }
    const album = map.get(t.album_id);
    album.tracks.push(t);
    if (!album.cover && t.cover_art_url) album.cover = t.cover_art_url;
  }
  return [...map.values()].map((album) => {
    album.tracks.sort((a, b) => (a.track_number || 0) - (b.track_number || 0));
    album.title =
      album.tracks.find((t) => t.album_title)?.album_title ||
      album.tracks[0]?.title ||
      "Release";
    return album;
  });
}