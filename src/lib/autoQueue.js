import { base44 } from "@/api/base44Client";
import { getPublishedTracks } from "@/lib/catalogCache";
import { byNewest, byPlays, shuffleList } from "@/lib/catalogSlices";

/**
 * Builds the next batch of tracks to keep playback going:
 * 1. more from the same artist, 2. same genre, 3. popular + fresh exploration.
 * Always returns a mixed list (max `limit`), never repeating excluded ids.
 *
 * Every pool is sliced from the shared cached catalog, so filling the queue
 * costs no request at all when another discovery screen has already loaded it
 * (it used to fire five to eight queries each time the queue ran low).
 */
export async function buildAutoQueue(seed, excludeIds = [], limit = 15, userGenres = []) {
  const skip = new Set(excludeIds);
  if (seed?.id) skip.add(seed.id);

  const genreQueries = (userGenres?.length ? userGenres : seed?.genre ? [seed.genre] : []).slice(0, 4);

  const catalog = await getPublishedTracks().catch(() => []);
  const sameArtist = seed?.artist
    ? byNewest(catalog.filter((t) => t.artist === seed.artist), 30)
    : [];
  const sameGenre = seed?.genre
    ? byNewest(catalog.filter((t) => t.genre === seed.genre), 50)
    : [];
  const popular = byPlays(catalog, 50);
  const fresh = byNewest(catalog, 50);
  const userGenreLists = genreQueries.map((g) =>
    byPlays(catalog.filter((t) => t.genre === g), 40)
  );

  const take = (list, n) => {
    const out = [];
    for (const t of list) {
      if (!t?.id || skip.has(t.id)) continue;
      skip.add(t.id);
      out.push(t);
      if (out.length >= n) break;
    }
    return out;
  };

  const userPool = shuffleList(userGenreLists.flat());

  const picks = [
    ...take(sameArtist, 2),
    ...take(userPool, userGenres?.length ? 8 : 0),
    ...take(shuffleList(sameGenre), 4),
    ...take(shuffleList(popular), 2),
    ...take(shuffleList(fresh), 2),
  ];

  return picks.slice(0, limit);
}