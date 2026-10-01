import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// One source of truth for likes: records the Like, recomputes the track's
// like_count from the real records (never a client-sent number), and notifies
// the uploader. Runs with the service role because a listener must not be able
// to edit someone else's track.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const trackId = body?.track_id;
    if (!trackId) return Response.json({ error: 'track_id is required' }, { status: 400 });

    const track = await base44.asServiceRole.entities.Track.get(trackId).catch(() => null);
    if (!track) return Response.json({ error: 'Track not found' }, { status: 404 });

    const mine = await base44.asServiceRole.entities.Like.filter(
      { user_id: user.id, track_id: trackId },
      '-created_date',
      5
    );
    const existing = Array.isArray(mine) ? mine[0] : null;

    let liked;
    if (existing) {
      await base44.asServiceRole.entities.Like.delete(existing.id);
      liked = false;
    } else {
      await base44.asServiceRole.entities.Like.create({
        user_id: user.id,
        track_id: trackId,
      });
      liked = true;
    }

    // Counted from the records themselves so the number can never drift.
    let likeCount = 0;
    for (let skip = 0; skip < 100000; skip += 1000) {
      const page = await base44.asServiceRole.entities.Like.filter(
        { track_id: trackId },
        '-created_date',
        1000,
        skip
      );
      if (!Array.isArray(page) || page.length === 0) break;
      likeCount += page.length;
      if (page.length < 1000) break;
    }
    await base44.asServiceRole.entities.Track.update(trackId, { like_count: likeCount });

    if (liked && track.uploader_id && track.uploader_id !== user.id) {
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_id: track.uploader_id,
          type: 'track_liked',
          actor_id: user.id,
          track_id: trackId,
        });
      } catch {
        /* a missing notification must never fail the like */
      }
    }

    return Response.json({ liked, like_count: likeCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}