import { base44 } from "@/api/base44Client";
import { getRecentPlays } from "@/lib/recentPlays";
import { getUserGenres } from "@/lib/userGenres";
import { trackMatchesArtist } from "@/lib/artistTracks";

// The home "For You" mix. One personalized queue built from three signals:
// who the user follows, the genres they picked, and what they actually play.
// Recently played tracks are left out so the mix keeps moving forward, and
// anything outside the catalog's published tracks never enters the pool.
export async function buildForYouMix(user, limit = 14) {
  const played = getRecentPlays();
  const recentIds = new Set(played.map((t) => t?.id).filter(Boolean));

  const savedGenres = (await getUserGenres().catch(() => [])) || [];
  const genreFreq = {};
  for (const p of played) {
    if (p?.genre) genreFreq[p.genre] = (genreFreq[p.genre] || 0) + 1;
  }
  const playedGenres = Object.entries(genreFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);
  const genres = [...new Set([...savedGenres, ...playedGenres])].slice(0, 4);

  const follows = user?.id
    ? await base44.entities.Follow.filter({ follower_id: user.id }, "-created_date", 200).catch(() => [])
    : [];
  const followedUserIds = new Set(
    (follows || [])
      .filter((f) => f && (f.target_type || "user") === "user")
      .map((f) => f.following_id)
  );
  const followedArtists = (follows || [])
    .filter((f) => f && f.target_type === "artist" && f.artist_name)
    .map((f) => f.artist_name);

  const [perGenre, popular] = await Promise.all([
    Promise.all(
      genres.map((g) =>
        base44.entities.Track
          .filter({ is_published: true, genre: g }, "-created_date", 24)
          .catch(() => [])
      )
    ),
    base44.entities.Track.filter({ is_published: true }, "-play_count", 60).catch(() => []),
  ]);

  const pool = new Map();
  for (const track of [...perGenre.flat(), ...(popular || [])]) {
    if (track?.id && !pool.has(track.id)) pool.set(track.id, track);
  }

  const scored = [];
  for (const track of pool.values()) {
    if (recentIds.has(track.id)) continue;
    let score = 0;
    if (track.uploader_id && followedUserIds.has(track.uploader_id)) score += 100;
    if (followedArtists.some((name) => trackMatchesArtist(track, name))) score += 60;
    if (track.genre && genres.includes(track.genre)) score += 30;
    score += Math.min(20, (track.play_count || 0) / 50);
    if (track.created_date) {
      const days = (Date.now() - new Date(track.created_date).getTime()) / 86400000;
      if (isFinite(days)) score += Math.max(0, 10 - days / 3);
    }
    scored.push({ track, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const picks = scored.slice(0, limit * 2).map((s) => s.track);
  // Light shuffle across the strongest picks so repeat visits don't open with
  // the same three songs every time.
  for (let i = picks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return picks.slice(0, limit);
}