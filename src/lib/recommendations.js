import { base44 } from "@/api/base44Client";
import { getRecentPlays } from "@/lib/recentPlays";

const MAX_SEEDS = 60;
const GENRE_POOL = 30;

function bump(map, key, amount) {
  if (!key) return;
  map[key] = (map[key] || 0) + amount;
}

// Builds a "For You" row from what the listener has actually done — liked,
// saved, replayed, and who they follow — then ranks published tracks against
// that profile while skipping anything they already know or that another row
// on the page is already showing. Returns [] for listeners with no signals yet.
export async function fetchForYou({ userId, excludeIds = [], limit = 12 }) {
  if (!userId) return [];

  const [likes, saved, follows] = await Promise.all([
    base44.entities.Like.filter({ user_id: userId }, "-created_date", 100).catch(() => []),
    base44.entities.LibraryItem.filter({ user_id: userId }, "-created_date", 100).catch(() => []),
    base44.entities.Follow.filter({ follower_id: userId }, "-created_date", 100).catch(() => []),
  ]);

  const likedIds = [...new Set((likes || []).map((l) => l.track_id).filter(Boolean))];
  const savedIds = [...new Set((saved || []).map((s) => s.track_id).filter(Boolean))];
  const followedIds = [...new Set((follows || []).map((f) => f.following_id).filter(Boolean))];
  const played = getRecentPlays();

  if (!likedIds.length && !savedIds.length && !followedIds.length && !played.length) return [];

  const seedIds = [...new Set([...likedIds, ...savedIds])].slice(0, MAX_SEEDS);
  const seeds = seedIds.length
    ? await base44.entities.Track.filter({ id: { $in: seedIds } }).catch(() => [])
    : [];
  const seedById = new Map((seeds || []).filter(Boolean).map((t) => [t.id, t]));

  // Genre keeps its canonical casing (queries need it); artists compare loosely.
  const genreScore = {};
  const artistScore = {};
  const taste = (track, weight) => {
    if (!track) return;
    bump(genreScore, track.genre, weight);
    bump(artistScore, (track.artist || "").toLowerCase().trim(), weight);
  };

  for (const id of likedIds) taste(seedById.get(id), 3);
  for (const id of savedIds) taste(seedById.get(id), 2);
  for (const p of played) {
    // A track on repeat says more about taste than one played once.
    bump(genreScore, p.genre, 1 + Math.min(2, (p.plays || 1) - 1));
    bump(artistScore, (p.artist || "").toLowerCase().trim(), 1);
  }

  const known = new Set([
    ...likedIds,
    ...savedIds,
    ...played.map((p) => p.id),
    ...excludeIds,
  ]);

  const topGenres = Object.entries(genreScore)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([g]) => g);

  const [genrePools, followPicks] = await Promise.all([
    Promise.all(
      topGenres.map((g) =>
        base44.entities.Track.filter({ is_published: true, genre: g }, "-created_date", GENRE_POOL).catch(
          () => []
        )
      )
    ),
    followedIds.length
      ? base44.entities.Track.filter(
          { is_published: true, uploader_id: { $in: followedIds.slice(0, 50) } },
          "-created_date",
          30
        ).catch(() => [])
      : Promise.resolve([]),
  ]);

  const scored = [];
  const seen = new Set();
  for (const t of [...followPicks, ...genrePools.flat()]) {
    if (!t || seen.has(t.id) || known.has(t.id)) continue;
    seen.add(t.id);
    let score = genreScore[t.genre] || 0;
    score += (artistScore[(t.artist || "").toLowerCase().trim()] || 0) * 1.5;
    if (followedIds.includes(t.uploader_id)) score += 4;
    // A light popularity nudge, then jitter so the row shifts between visits
    // instead of serving the same frozen list.
    score += Math.min(3, (t.like_count || 0) / 5);
    score += Math.random() * 1.5;
    scored.push({ t, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.t);
}