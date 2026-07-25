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