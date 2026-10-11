import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const MIN_QUERY = 2;
const USER_SCAN = 1000; // the whole directory is read in a single page
const MAX_RESULTS = 30;

// Only public profile fields ever leave this endpoint — never the email
// address or any other private field.
function publicProfile(u) {
  return {
    id: u.id,
    display_name: u.display_name || u.full_name || '',
    avatar_url: u.avatar_url || '',
    bio: u.bio || '',
    location: u.location || '',
    pronouns: u.pronouns || '',
    website: u.website || '',
    instagram: u.instagram || '',
    twitter: u.twitter || '',
    soundcloud: u.soundcloud || '',
  };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }

    const Q = String(body?.q || '').trim().toLowerCase();
    if (Q.length < MIN_QUERY) return Response.json({ results: [] });

    // People search is a directory lookup any signed-in user may use, so it
    // reads through the service role: the built-in User rules only let admins
    // list users, which would silently leave this section empty for everyone
    // else. The projection below is what keeps that elevation safe — public
    // profile fields only.
    const users = await base44.asServiceRole.entities.User.list('-created_date', USER_SCAN);

    const results = (Array.isArray(users) ? users : users?.items || [])
      .filter((u) => (u.display_name || u.full_name || '').toLowerCase().includes(Q))
      .slice(0, MAX_RESULTS)
      .map(publicProfile);

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}