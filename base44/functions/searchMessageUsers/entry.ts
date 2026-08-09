import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const Q = (body?.q || '').trim().toLowerCase();
    if (!Q) return Response.json({ results: [] });

    // Regular users can't list other users (built-in User RLS), so we use the
    // service role to search and return only minimal public profile info.
    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);

    const results = users
      .filter((u) => {
        if (u.id === user.id) return false;
        const name = (u.display_name || u.full_name || u.email || '').toLowerCase();
        return name.includes(Q);
      })
      .slice(0, 20)
      .map((u) => ({
        id: u.id,
        display_name: u.display_name || u.full_name || '',
        avatar_url: u.avatar_url || '',
      }));

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}