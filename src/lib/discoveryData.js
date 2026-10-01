import { base44 } from "@/api/base44Client";
import { makeCache } from "@/lib/cachedQuery";

// Home is the landing page, so its rows were read on every app load and again on
// every navigation back to "/" — roughly a dozen collection reads each time, and
// the main driver of the API rate limit. Each row is now shared for a short
// window: repeated visits cost nothing, while the content still refreshes and
// pull-to-refresh forces a fresh read.
const HOME = { ttl: 60 * 1000, retryAfterError: 20 * 1000 };

export const getTrendingTracks = makeCache(
  () => base44.entities.Track.filter({ is_published: true }, "-play_count", 10),
  HOME
);

export const getNewReleases = makeCache(
  () => base44.entities.Track.filter({ is_published: true }, "-created_date", 50),
  HOME
);

export const getMostPlayed = makeCache(
  () => base44.entities.Track.filter({ is_published: true }, "-play_count", 200),
  HOME
);

export const getFollowedIds = makeCache(
  async (userId) =>
    (await base44.entities.Follow.filter({ follower_id: userId }, "-created_date", 200)) || [],
  HOME
);

export const getGenreTopTracks = makeCache(
  (genre) => base44.entities.Track.filter({ is_published: true, genre }, "-play_count", 8),
  HOME
);

export const getGenreFreshTracks = makeCache(
  (genre) => base44.entities.Track.filter({ is_published: true, genre }, "-created_date", 30),
  HOME
);

export const invalidateDiscovery = () => {
  getTrendingTracks.invalidate();
  getNewReleases.invalidate();
  getMostPlayed.invalidate();
  getGenreTopTracks.invalidate();
  getGenreFreshTracks.invalidate();
};