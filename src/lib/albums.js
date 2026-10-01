import { base44 } from "@/api/base44Client";
import { getAlbums, getArtists, primeAlbum } from "@/lib/catalogCache";
import { GENRES } from "@/lib/audio-utils";

const normalize = (s) => (s || "").trim().replace(/\s+/g, " ").toLowerCase();

// "Blonde" and "Blonde (2016)" are the same release, so trailing years in a
// title never split an album in two.
const stripYear = (t) => (t || "").replace(/\s*[([{]\s*(19|20)\d{2}\s*[)\]}]?\s*$/, "");

const albumKey = (title, artistName) =>
  `${normalize(stripYear(title))}::${normalize(artistName)}`;

// Albums created during this session, so a batch upload of the same release
// files every track under ONE album record instead of one per track.
const sessionAlbums = new Map();
const inflight = new Map();

async function resolveArtist(name) {
  const target = normalize(name);
  if (!target) return null;
  const artists = await getArtists();
  return (artists || []).find((a) => normalize(a.name) === target) || null;
}

async function findByKey(key, title, artistName) {
  if (sessionAlbums.has(key)) return sessionAlbums.get(key);
  const albums = await getAlbums();
  const match = (albums || []).find((a) => albumKey(a.title, a.artist_name) === key);
  if (match) {
    sessionAlbums.set(key, match);
    return match;
  }
  return null;
}

/**
 * Finds the album a track belongs to — creating the record (linked to the
 * matching Artist when one exists) the first time that release is used, so
 * albums are real, linkable records instead of strings re-matched on every
 * screen. Returns null when there is nothing to file under.
 */
export async function ensureAlbum({
  title,
  artistName = "",
  coverArtUrl = "",
  genre = "",
  userId,
}) {
  const cleanTitle = (title || "").trim();
  if (!cleanTitle || !userId) return null;

  const key = albumKey(cleanTitle, artistName);
  if (inflight.has(key)) return inflight.get(key);

  const run = (async () => {
    const existing = await findByKey(key, cleanTitle, artistName);
    if (existing) {
      // Give the release artwork the first time some is available.
      if (!existing.cover_art_url && coverArtUrl) {
        base44.entities.Album
          .update(existing.id, { cover_art_url: coverArtUrl })
          .catch(() => {});
        primeAlbum({ ...existing, cover_art_url: coverArtUrl });
      }
      return existing;
    }

    const artist = await resolveArtist(artistName);
    const created = await base44.entities.Album.create({
      title: cleanTitle,
      artist_id: artist?.id || "",
      artist_name: (artistName || "").trim(),
      cover_art_url: coverArtUrl,
      genre: GENRES.includes(genre) ? genre : "Other",
      creator_id: userId,
    }).catch(() => null);

    if (created) {
      sessionAlbums.set(key, created);
      // Show the new release on the artist page right away.
      primeAlbum(created);
    }
    return created;
  })();

  inflight.set(key, run);
  try {
    return await run;
  } finally {
    inflight.delete(key);
  }
}

// Albums credited to an artist — by linked record first, then by name, so
// releases still attach to the right page before the artist record exists.
export function albumsForArtist(albums, artist) {
  if (!artist) return [];
  const target = normalize(artist.name);
  return (albums || []).filter(
    (a) => (artist.id && a.artist_id === artist.id) || normalize(a.artist_name) === target
  );
}