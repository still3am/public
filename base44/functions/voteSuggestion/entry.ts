import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const suggestionId = body?.suggestion_id;
    if (!suggestionId) return Response.json({ error: 'suggestion_id required' }, { status: 400 });

    const admin = base44.asServiceRole;
    const item = await admin.entities.Suggestion.get(suggestionId).catch(() => null);
    if (!item) return Response.json({ error: 'Not found' }, { status: 404 });

    const voterIds = Array.isArray(item.voter_ids) ? item.voter_ids : [];
    const has = voterIds.includes(user.id);
    // Update the array atomically to avoid a read-modify-write race where two
    // simultaneous votes clobber each other and drop one.
    if (has) {
      await admin.entities.Suggestion.updateMany({ id: suggestionId }, { $pull: { voter_ids: user.id } });
    } else {
      await admin.entities.Suggestion.updateMany({ id: suggestionId }, { $addToSet: { voter_ids: user.id } });
    }
    return Response.json({ voted: !has, voter_ids: has ? voterIds.filter(x => x !== user.id) : [...voterIds, user.id] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}