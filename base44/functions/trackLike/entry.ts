import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Toggles one user's like on a track and keeps the track's like_count honest.
// The count has to move under the service role because Track updates are
// owner-only under RLS, so a listener's like would never reach the artist.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const trackId = body?.track_id;
    const liked = body?.liked === true;
    if (!trackId) return Response.json({ error: 'track_id required' }, { status: 400 });

    // Read a track without a per-record get — the service-role client returns a
    // list here, and this never throws on a missing or malformed id.
    const readTrack = async (id: string) => {
      try {
        const found = await base44.asServiceRole.entities.Track.filter({ id });
        const list = Array.isArray(found) ? found : found?.items || [];
        return list[0] || null;
      } catch {
        return null;
      }
    };

    const existing = await base44.asServiceRole.entities.Like.filter({
      user_id: user.id,
      track_id: trackId,
    });
    const already = (existing || []).length > 0;

    if (liked && !already) {
      await base44.asServiceRole.entities.Like.create({ user_id: user.id, track_id: trackId });
      await base44.asServiceRole.entities.Track.updateMany({ id: trackId }, { $inc: { like_count: 1 } });

      const track = await readTrack(trackId);
      if (track?.uploader_id && track.uploader_id !== user.id) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: track.uploader_id,
          type: 'track_liked',
          actor_id: user.id,
          track_id: trackId,
        }).catch(() => null);
      }
    } else if (!liked && already) {
      await base44.asServiceRole.entities.Like.deleteMany({ user_id: user.id, track_id: trackId });
      const track = await readTrack(trackId);
      const next = Math.max(0, (track?.like_count || 0) - 1);
      await base44.asServiceRole.entities.Track.updateMany({ id: trackId }, { $set: { like_count: next } }).catch(() => null);
    }

    return Response.json({ liked });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}