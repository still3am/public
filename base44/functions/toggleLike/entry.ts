import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if(user.is_blocked || user.disabled) return Response.json({error:'Account suspended'},{status:403});

    const { track_id, liked } = await req.json();
    if (!track_id || typeof liked !== 'boolean') {
      return Response.json({ error: 'track_id and liked are required' }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.Like.filter(
      { user_id: user.id, track_id },
      '-created_date',
      50
    );

    if (liked && existing.length === 0) {
      await base44.asServiceRole.entities.Like.create({ user_id: user.id, track_id });
    }
    if (!liked && existing.length > 0) {
      await Promise.all(existing.map((l) => base44.asServiceRole.entities.Like.delete(l.id)));
    }

    const like_count = await base44.asServiceRole.entities.Like.count({ track_id });
    await base44.asServiceRole.entities.Track.update(track_id, { like_count });

    return Response.json({ liked, like_count });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}