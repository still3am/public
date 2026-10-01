import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * Like / unlike a track.
 *
 * The like record itself is created in the user's scope (its RLS allows the
 * owner to write it), but the track's like_count and the uploader's
 * notification live outside the user's permissions, so those writes go through
 * the service role after the caller is authenticated.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const trackId = body?.track_id;
    if (!trackId) return Response.json({ error: 'track_id is required' }, { status: 400 });

    const tracks = await base44.asServiceRole.entities.Track.filter({ id: trackId });
    const track = tracks?.[0];
    if (!track) return Response.json({ error: 'Track not found' }, { status: 404 });

    const existing = await base44.entities.Like.filter({
      user_id: user.id,
      track_id: trackId,
    });
    const wasLiked = (existing || []).length > 0;

    if (wasLiked) {
      await base44.entities.Like.deleteMany({ user_id: user.id, track_id: trackId });
    } else {
      await base44.entities.Like.create({ user_id: user.id, track_id: trackId });

      // Tell the uploader once — not for your own tracks, never duplicated.
      if (track.uploader_id && track.uploader_id !== user.id) {
        const already = await base44.asServiceRole.entities.Notification.filter({
          user_id: track.uploader_id,
          type: 'track_liked',
          actor_id: user.id,
          track_id: trackId,
        });
        if (!(already || []).length) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: track.uploader_id,
            type: 'track_liked',
            actor_id: user.id,
            track_id: trackId,
          });
        }
      }
    }

    const current = Math.max(0, Number(track.like_count) || 0);
    const likeCount = wasLiked ? Math.max(0, current - 1) : current + 1;
    await base44.asServiceRole.entities.Track.update(trackId, { like_count: likeCount });

    return Response.json({ liked: !wasLiked, like_count: likeCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}