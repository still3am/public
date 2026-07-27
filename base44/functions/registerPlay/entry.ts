import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const trackId = body?.track_id;
    if (!trackId) return Response.json({ error: 'track_id required' }, { status: 400 });

    // Service role bypasses the Track owner-only update RLS so listeners'
    // play counts actually increment, regardless of who owns the track.
    await base44.asServiceRole.entities.Track.updateMany({ id: trackId }, { $inc: { play_count: 1 } });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}