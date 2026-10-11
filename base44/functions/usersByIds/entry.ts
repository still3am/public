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

    // Public profile fields only — never email, role, or block status. This is
    // what the profile page renders for a member other than yourself, since the
    // built-in User rules only let admins read other users.
    const users = (rows || []).filter(Boolean).map((u) => ({
      id: u.id,
      display_name: u.display_name || u.full_name || '',
      full_name: u.full_name || '',
      avatar_url: u.avatar_url || '',
      banner_url: u.banner_url || '',
      bio: u.bio || '',
      location: u.location || '',
      pronouns: u.pronouns || '',
      website: u.website || '',
      instagram: u.instagram || '',
      twitter: u.twitter || '',
      soundcloud: u.soundcloud || '',
      status_message: u.status_message || '',
      featured_track_id: u.featured_track_id || '',
      top_track_ids: Array.isArray(u.top_track_ids) ? u.top_track_ids : [],
      is_artist: !!u.is_artist,
      created_date: u.created_date || '',
    }));

    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}