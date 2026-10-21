import { createClientFromRequest } from 'npm:@base44/sdk';

export default async function handleRequest(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if(user.is_blocked || user.disabled) return Response.json({error:'Account suspended'},{status:403});

    const { track_id, liked, recount_only } = await req.json();
    if (typeof track_id !== 'string' || !track_id || (recount_only !== true && typeof liked !== 'boolean')) {
      return Response.json({ error: 'track_id and liked are required' }, { status: 400 });
    }

    const track=await base44.entities.Track.get(track_id);
    if(!track)return Response.json({error:'Track unavailable'},{status:404});
    const blocked=await base44.asServiceRole.entities.Block.filter({$or:[{user_id:user.id,blocked_user_id:track.uploader_id},{user_id:track.uploader_id,blocked_user_id:user.id}]},'-created_date',1);
    if(blocked.length)return Response.json({error:'Interaction unavailable'},{status:403});
    const existing = await base44.asServiceRole.entities.Like.filter(
      { user_id: user.id, track_id },
      '-created_date',
      50
    );

    if (recount_only !== true && liked && existing.length === 0) {
      await base44.asServiceRole.entities.Like.create({ user_id: user.id, track_id });
    }
    if (recount_only !== true && !liked && existing.length > 0) {
      await Promise.all(existing.map((l) => base44.asServiceRole.entities.Like.delete(l.id)));
    }

    const like_count = await base44.asServiceRole.entities.Like.count({ track_id });
    await base44.asServiceRole.entities.Track.update(track_id, { like_count });

    return Response.json({ liked, like_count });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
// Register the HTTP handler in Base44’s Deno runtime.
if (typeof Deno !== "undefined") Deno.serve(handleRequest);
