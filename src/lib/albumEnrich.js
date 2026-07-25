import { base44 } from "@/api/base44Client";

const cache = new Map();

// Fetches album records for every distinct album_id in `tracks`
// and returns a map keyed by album_id. Cached per session.
export async function getAlbumsMapForTracks(tracks) {
  const ids = Array.from(
    new Set((tracks || []).map((t) => t.album_id).filter(Boolean))
  );
  const missing = ids.filter((id) => !cache.has(id));
  if (missing.length) {
    const albums = await Promise.all(
      missing.map((id) => base44.entities.Album.get(id).catch(() => null))
    );
    albums.forEach((a) => {
      if (a) cache.set(a.id, a);
    });
  }
  const map = {};
  ids.forEach((id) => {
    map[id] = cache.get(id) || null;
  });
  return map;
}

// Resolves the artist name to display for a track.
// For tracks that belong to an album, the album's artist is preferred when
// the track's own artist is missing or was auto-filled with the uploader's
// name (the upload flow's default). Falls back to the uploader's name.
export function displayArtist(track, albumArtist) {
  const a = (track?.artist || "").trim();
  const al = (albumArtist || "").trim();
  if (al && (!a || a === track?.uploader_name)) return al;
  return a || al || track?.uploader_name || "Unknown";
}