import { base44 } from "@/api/base44Client";

// Likes live in the Like entity (one row per user + track). The track's
// like_count is moved by the trackLike backend function, since Track updates
// are owner-only under RLS.
export async function setTrackLike(trackId, liked) {
  const res = await base44.functions.invoke("trackLike", { track_id: trackId, liked });
  return res?.data?.liked ?? liked;
}

export async function isTrackLiked(userId, trackId) {
  if (!userId || !trackId) return false;
  const page = await base44.entities.Like.filter({ user_id: userId, track_id: trackId }, { limit: 1 });
  return (page?.items || []).length > 0;
}

export async function isFollowingArtist(userId, artistId) {
  if (!userId || !artistId) return false;
  const page = await base44.entities.Follow.filter(
    { follower_id: userId, following_id: artistId },
    { limit: 1 }
  );
  return (page?.items || []).length > 0;
}

export async function setArtistFollow(userId, artistId, following) {
  if (!userId || !artistId) return;
  if (following) {
    await base44.entities.Follow.create({ follower_id: userId, following_id: artistId });
    try {
      await base44.entities.Notification.create({
        user_id: artistId,
        type: "new_follower",
        actor_id: userId,
      });
    } catch {}
  } else {
    await base44.entities.Follow.deleteMany({ follower_id: userId, following_id: artistId });
  }
}