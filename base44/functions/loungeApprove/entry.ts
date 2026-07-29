import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Lets a Lounge host approve or reject a pending member. The LoungeMember
// entity's RLS only lets each user update their own row, so the host's approve
// action goes through this function which verifies the caller is the session
// host and uses the service role to flip the member's status.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { member_id, session_id, action } = body || {};
    if (!member_id || !session_id) {
      return Response.json({ error: 'Missing member_id or session_id' }, { status: 400 });
    }
    if (action !== 'approve' && action !== 'reject') {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Verify the caller is the host of this session.
    const sessions = await base44.asServiceRole.entities.LoungeSession.filter(
      { id: session_id },
      undefined,
      5
    );
    if (!sessions || !sessions.length) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }
    const session = sessions[0];
    if (session.host_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: 'Only the host can approve members' }, { status: 403 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await base44.asServiceRole.entities.LoungeMember.update(member_id, { status: newStatus });
    return Response.json({ ok: true, status: newStatus });
  } catch (error) {
    return Response.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}