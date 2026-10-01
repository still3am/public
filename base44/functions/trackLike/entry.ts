import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const trackId = body?.track_id;
    if (!trackId) return Response.json({ error: 'track_id required' }, { status: 400 });

    // Service role: a listener is not the track's uploader, so the Track
    // owner-only update RLS would reject the counter change from the client.
    const admin = base44.asServiceRole;
    const rows = await admin.entities.Like.filter(
      { user_id: user.id, track_id: trackId },
      '-created_date',
      5
    );
    const wasLiked = Array.isArray(rows) && rows.length > 0;

    if (wasLiked) {
      await admin.entities.Like.deleteMany({ user_id: user.id, track_id: trackId });
      await admin.entities.Track.updateMany({ id: trackId }, { $inc: { like_count: -1 } });
    } else {
      await admin.entities.Like.create({ user_id: user.id, track_id: trackId });
      await admin.entities.Track.updateMany({ id: trackId }, { $inc: { like_count: 1 } });
    }

    return Response.json({ liked: !wasLiked });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}