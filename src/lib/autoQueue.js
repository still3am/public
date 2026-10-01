import { base44 } from "@/api/base44Client";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Builds the next batch of tracks to keep playback going:
 * 1. more from the same artist, 2. same genre, 3. popular + fresh exploration.
 * Always returns a mixed list (max `limit`), never repeating excluded ids.
 */
export async function buildAutoQueue(seed, excludeIds = [], limit = 15, userGenres = []) {
  const skip = new Set(excludeIds);
  if (seed?.id) skip.add(seed.id);

  const genreQueries = (userGenres?.length ? userGenres : seed?.genre ? [seed.genre] : []).slice(0, 4);

  const [sameArtist, sameGenre, popular, fresh, userGenreLists] = await Promise.all([
    seed?.artist
      ? base44.entities.Track.filter(
          { is_published: true, artist: seed.artist },
          "-created_date",
          30
        ).catch(() => [])
      : Promise.resolve([]),
    seed?.genre
      ? base44.entities.Track.filter(
          { is_published: true, genre: seed.genre },
          "-created_date",
          50
        ).catch(() => [])
      : Promise.resolve([]),
    base44.entities.Track.filter({ is_published: true }, "-play_count", 50).catch(
      () => []
    ),
    base44.entities.Track.filter({ is_published: true }, "-created_date", 50).catch(
      () => []
    ),
    Promise.all(
      genreQueries.map((g) =>
        base44.entities.Track.filter({ is_published: true, genre: g }, "-play_count", 40).catch(() => [])
      )
    ),
  ]);

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

  const userPool = shuffle(userGenreLists.flat());

  const picks = [
    ...take(sameArtist, 2),
    ...take(userPool, userGenres?.length ? 8 : 0),
    ...take(shuffle(sameGenre), 4),
    ...take(shuffle(popular), 2),
    ...take(shuffle(fresh), 2),
  ];

  return picks.slice(0, limit);
}