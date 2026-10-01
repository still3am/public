import { base44 } from "@/api/base44Client";

// Follow relationships live in the Follow entity. Artist follows use the
// uploader's account id, which is the real relationship PUBLIC stores — display
// names are never used as the key.

export async function isFollowingUser(followerId, followingId) {
  if (!followerId || !followingId || followerId === followingId) return false;
  try {
    const rows = await base44.entities.Follow.filter(
      { follower_id: followerId, following_id: followingId },
      "-created_date",
      1
    );
    return !!(Array.isArray(rows) && rows.length);
  } catch {
    return false;
  }
}

export async function toggleFollowUser(followerId, followingId) {
  if (!followerId || !followingId || followerId === followingId) return null;
  const rows = await base44.entities.Follow.filter(
    { follower_id: followerId, following_id: followingId },
    "-created_date",
    5
  );
  const existing = Array.isArray(rows) ? rows[0] : null;

  if (existing) {
    await base44.entities.Follow.delete(existing.id);
    return false;
  }

  await base44.entities.Follow.create({
    follower_id: followerId,
    following_id: followingId,
  });
  try {
    await base44.entities.Notification.create({
      user_id: followingId,
      type: "new_follower",
      actor_id: followerId,
    });
  } catch {
    /* the follow itself already succeeded */
  }
  return true;
}

export async function countFollows(userId) {
  if (!userId) return { followers: 0, following: 0 };
  try {
    const [followers, following] = await Promise.all([
      base44.entities.Follow.filter({ following_id: userId }, "-created_date", 5000),
      base44.entities.Follow.filter({ follower_id: userId }, "-created_date", 5000),
    ]);
    return {
      followers: Array.isArray(followers) ? followers.length : 0,
      following: Array.isArray(following) ? following.length : 0,
    };
  } catch {
    return { followers: 0, following: 0 };
  }
}