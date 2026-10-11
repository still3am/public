import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Like / unlike a track.
//
// The Like row itself is trivial, but `Track.like_count` lives on a record the
// listener does not own, and Track updates are owner/admin-only — so the count
// is written here with the service role, in the same call that flips the Like
// row. That keeps "liked by me" and the public like count from ever disagreeing.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const trackId = body?.track_id;
    const liked = !!body?.liked;
    if (!trackId) return Response.json({ error: 'track_id required' }, { status: 400 });

    const [existing, track] = await Promise.all([
      base44.asServiceRole.entities.Like.filter(
        { user_id: user.id, track_id: trackId },
        '-created_date',
        10
      ),
      base44.asServiceRole.entities.Track.get(trackId).catch(() => null),
    ]);

    const current = track?.like_count || 0;
    const already = Array.isArray(existing) ? existing : [];

    if (liked && !already.length) {
      await base44.asServiceRole.entities.Like.create({
        user_id: user.id,
        track_id: trackId,
      });
      await base44.asServiceRole.entities.Track.updateMany(
        { id: trackId },
        { $set: { like_count: current + 1 } }
      );
      if (track?.uploader_id && track.uploader_id !== user.id) {
        try {
          await base44.asServiceRole.entities.Notification.create({
            user_id: track.uploader_id,
            type: 'track_liked',
            track_id: trackId,
            actor_id: user.id,
          });
        } catch {}
      }
      return Response.json({ liked: true, like_count: current + 1 });
    }

    if (!liked && already.length) {
      await Promise.all(
        already.map((row) => base44.asServiceRole.entities.Like.delete(row.id))
      );
      const next = Math.max(0, current - 1);
      await base44.asServiceRole.entities.Track.updateMany(
        { id: trackId },
        { $set: { like_count: next } }
      );
      return Response.json({ liked: false, like_count: next });
    }

    return Response.json({ liked: !!already.length, like_count: current });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}