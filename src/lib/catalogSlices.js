// Discovery shelves, sliced from the shared cached copy of the published
// catalog (see catalogCache) instead of a query per row. Home, the For You mix
// and the auto-queue all read the same list once and shape it locally, which
// keeps the app well clear of the API rate limit.

export function shuffleList(list) {
  const a = [...(list || [])];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function byPlays(tracks, limit) {
  return [...(tracks || [])]
    .filter(Boolean)
    .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
    .slice(0, limit);
}

export function byNewest(tracks, limit) {
  return [...(tracks || [])]
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b.created_date || 0).getTime() -
        new Date(a.created_date || 0).getTime()
    )
    .slice(0, limit);
}

/** Most played tracks in a genre: `sort` is "plays" or "newest". */
export function byGenre(tracks, genre, limit, sort = "plays") {
  const inGenre = (tracks || []).filter((t) => t && t.genre === genre);
  return sort === "plays" ? byPlays(inGenre, limit) : byNewest(inGenre, limit);
}

/**
 * The genres the platform actually listens to most, measured by aggregated
 * play_count across the most-played tracks. Falls back to a spread of genres so
 * the shelf never disappears on a quiet day.
 */
export function topGenres(tracks, limit = 3) {
  const plays = {};
  for (const t of tracks || []) {
    if (!t?.genre) continue;
    plays[t.genre] = (plays[t.genre] || 0) + (t.play_count || 0);
  }
  const ranked = Object.entries(plays)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([g]) => g)
    .filter(Boolean);
  return ranked.length ? ranked : ["Electronic", "Hip-Hop", "Ambient"];
}