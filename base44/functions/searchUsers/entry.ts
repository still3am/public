import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const Q = (body?.q || '').trim().toLowerCase();
    if (!Q) return Response.json({ results: [] });

    // Honor built-in User RLS: regular (non-admin) users are not permitted to
    // list other users. Using the user-scoped client (instead of the service
    // role) lets the platform enforce that — admins get results, non-admins
    // get an empty list rather than a full user dump.
    let users = [];
    try {
      users = await base44.entities.User.list('-created_date', 500);
    } catch {
      users = [];
    }

    const results = users
      .filter((u) => {
        const name = (u.display_name || u.full_name || u.email || '').toLowerCase();
        return name.includes(Q);
      })
      .map((u) => ({
        id: u.id,
        display_name: u.display_name || u.full_name || '',
        avatar_url: u.avatar_url || '',
        bio: u.bio || '',
        is_verified: !!u.is_verified,
        can_upload: !!u.can_upload,
        follower_count: u.follower_count || 0,
        following_count: u.following_count || 0,
        location: u.location || '',
        pronouns: u.pronouns || '',
        website: u.website || '',
        instagram: u.instagram || '',
        twitter: u.twitter || '',
        soundcloud: u.soundcloud || '',
      }));

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
});