import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const trackId = body?.track_id;
    if (!trackId) return Response.json({ error: 'track_id required' }, { status: 400 });

    const admin = base44.asServiceRole;

    const existing = await admin.entities.Like.filter({ user_id: user.id, track_id: trackId });
    const alreadyLiked = !!(existing && existing.length);

    if (alreadyLiked) {
      await admin.entities.Like.deleteMany({ user_id: user.id, track_id: trackId });
      await admin.entities.Track.updateMany({ id: trackId }, { $inc: { like_count: -1 } });
      // Guard against the denormalized counter drifting negative if it ever
      // fell out of sync (e.g. likes removed without updating the count).
      await admin.entities.Track.updateMany({ id: trackId }, { $max: { like_count: 0 } });
      return Response.json({ liked: false });
    }

    await admin.entities.Like.create({ user_id: user.id, track_id: trackId });
    await admin.entities.Track.updateMany({ id: trackId }, { $inc: { like_count: 1 } });

    // notify the uploader (only if it isn't the user's own track), best-effort
    try {
      const track = await admin.entities.Track.get(trackId).catch(() => null);
      if (track && track.uploader_id && track.uploader_id !== user.id) {
        await admin.entities.Notification.create({
          user_id: track.uploader_id,
          type: 'track_liked',
          actor_id: user.id,
          track_id: trackId,
        });
      }
    } catch {}

    return Response.json({ liked: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}