// Derives "similar artists" purely from the catalogue we already have: each
// artist is represented as a vector of genre counts taken from their published
// tracks, and similarity is the cosine distance between those vectors.

export const splitArtistNames = (str) =>
  (str || "")
    .split(/\s*(?:,|&| feat\.| ft\.| x |;)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);

// Builds { normalizedName: { label, genres: {genre: count}, total } }
export function buildArtistGenreVectors(tracks) {
  const map = new Map();
  for (const t of tracks || []) {
    const genre = t.genre || "Other";
    for (const raw of splitArtistNames(t.artist)) {
      const key = raw.toLowerCase();
      if (!map.has(key)) map.set(key, { label: raw, genres: {}, total: 0 });
      const e = map.get(key);
      e.genres[genre] = (e.genres[genre] || 0) + 1;
      e.total += 1;
    }
  }
  return map;
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const g in a) {
    na += a[g] * a[g];
    if (b[g]) dot += a[g] * b[g];
  }
  for (const g in b) nb += b[g] * b[g];
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Returns the top `limit` artists most similar to `artistName`.
export function findSimilarArtists(tracks, artistName, limit = 8) {
  const vectors = buildArtistGenreVectors(tracks);
  const targets = splitArtistNames(artistName).map((n) => n.toLowerCase());
  if (!targets.length) return [];

  // Merge the genre vectors of every alias of the subject artist.
  const base = {};
  for (const key of targets) {
    const e = vectors.get(key);
    if (!e) continue;
    for (const g in e.genres) base[g] = (base[g] || 0) + e.genres[g];
  }
  if (!Object.keys(base).length) return [];

  const out = [];
  for (const [key, e] of vectors) {
    if (targets.includes(key)) continue;
    const score = cosine(base, e.genres);
    if (score <= 0) continue;
    const shared = Object.keys(e.genres)
      .filter((g) => base[g])
      .sort((x, y) => e.genres[y] - e.genres[x]);
    out.push({ name: e.label, score, trackCount: e.total, sharedGenres: shared });
  }

  return out
    .sort((a, b) => b.score - a.score || b.trackCount - a.trackCount)
    .slice(0, limit);
}