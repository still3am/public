import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Lets a Lounge host (or the member who added a track, or an admin) remove a
// track from the shared lounge queue. The LoungeQueueItem entity's RLS only
// lets the person who added an item delete it, so the host's removal goes
// through this function which verifies the caller's authority and uses the
// service role to delete the record — syncing the removal to all devices via
// the existing realtime subscription.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { queue_item_id } = body || {};
    if (!queue_item_id) {
      return Response.json({ error: 'Missing queue_item_id' }, { status: 400 });
    }

    // Fetch the queue item (service role — RLS would block the host from
    // reading items they didn't add, but the host needs to see all of them).
    const items = await base44.asServiceRole.entities.LoungeQueueItem.filter(
      { id: queue_item_id },
      undefined,
      5
    );
    if (!items || !items.length) {
      return Response.json({ error: 'Queue item not found' }, { status: 404 });
    }
    const item = items[0];

    // The person who added the track can always remove their own addition.
    if (item.added_by_id !== user.id && user.role !== 'admin') {
      // Otherwise, verify the caller is the host of this session.
      const sessions = await base44.asServiceRole.entities.LoungeSession.filter(
        { id: item.session_id },
        undefined,
        5
      );
      if (!sessions || !sessions.length) {
        return Response.json({ error: 'Session not found' }, { status: 404 });
      }
      if (sessions[0].host_id !== user.id) {
        return Response.json({ error: 'Only the host can remove this track' }, { status: 403 });
      }
    }

    await base44.asServiceRole.entities.LoungeQueueItem.delete(queue_item_id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}