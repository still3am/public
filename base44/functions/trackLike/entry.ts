import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Like / unlike a track.
//
// A Like record is personal data, but the public like_count on the track can
// only be written by the uploader (or an admin) under Track's rules — so the
// toggle and the counter update both run here, as the app itself.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const trackId = body?.track_id;
    const like = body?.like === true;
    if (!trackId) {
      return Response.json({ error: 'track_id is required' }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.Like
      .filter({ user_id: user.id, track_id: trackId }, '-created_date', 5)
      .catch(() => []);
    const already = Array.isArray(existing) && existing.length > 0;

    const track = await base44.asServiceRole.entities.Track
      .get(trackId)
      .catch(() => null);
    const current = Math.max(0, Number(track?.like_count) || 0);

    if (like && !already) {
      await base44.asServiceRole.entities.Like.create({
        user_id: user.id,
        track_id: trackId,
      });
      if (track) {
        await base44.asServiceRole.entities.Track.update(trackId, {
          like_count: current + 1,
        });
      }
      return Response.json({ liked: true, like_count: current + 1 });
    }

    if (!like && already) {
      for (const rec of existing) {
        await base44.asServiceRole.entities.Like.delete(rec.id);
      }
      const next = Math.max(0, current - 1);
      if (track) {
        await base44.asServiceRole.entities.Track.update(trackId, { like_count: next });
      }
      return Response.json({ liked: false, like_count: next });
    }

    return Response.json({ liked: already, like_count: current });
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Could not update like' },
      { status: 500 }
    );
  }
}