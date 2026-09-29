import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Resolves many user ids in ONE request. Surfaces like the follower list and the
// notifications feed previously fired one User.get per id, which burst the API
// and tripped the platform rate limit.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids)
      ? [...new Set(body.ids.filter((i) => typeof i === 'string' && i))].slice(0, 200)
      : [];
    if (!ids.length) return Response.json({ users: [] });

    let rows = [];
    try {
      rows = await base44.asServiceRole.entities.User.filter({ id: { $in: ids } });
    } catch {
      rows = [];
    }
    if (!rows || rows.length === 0) {
      // Fallback for environments where the $in operator isn't available.
      const found = await Promise.all(
        ids.slice(0, 50).map((id) => base44.asServiceRole.entities.User.get(id).catch(() => null))
      );
      rows = found.filter(Boolean);
    }

    // Only public profile fields — never email or role.
    const users = (rows || []).filter(Boolean).map((u) => ({
      id: u.id,
      display_name: u.display_name || u.full_name || '',
      full_name: u.full_name || '',
      avatar_url: u.avatar_url || '',
      bio: u.bio || '',
      location: u.location || '',
      pronouns: u.pronouns || '',
      website: u.website || '',
      instagram: u.instagram || '',
      twitter: u.twitter || '',
      soundcloud: u.soundcloud || '',
    }));

    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}