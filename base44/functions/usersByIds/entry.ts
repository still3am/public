import { createClientFromRequest } from 'npm:@base44/sdk';

// Resolves many user ids in ONE request. Surfaces like the follower list and the
// notifications feed previously fired one User.get per id, which burst the API
// and tripped the platform rate limit.
export default async function handleRequest(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if(user.is_blocked || user.disabled) return Response.json({error:'Account suspended'},{status:403});

    const body = await req.json().catch(() => ({}));
    if (body.action === 'giphy_search' || body.action === 'add_giphy_to_marketplace') {
      const key = Deno.env.get('GIPHY_API_KEY');
      if (!key) return Response.json({ error: 'GIPHY search is not configured yet.' }, { status: 503 });
      const gifId = typeof body.id === 'string' ? body.id.trim() : '';
      if (body.action === 'add_giphy_to_marketplace' && (!/^[a-zA-Z0-9]{1,64}$/.test(gifId) || !['avatar','banner'].includes(body.kind))) {
        return Response.json({ error: 'Choose a valid GIPHY GIF and profile type.' }, { status: 400 });
      }
      if (body.action === 'add_giphy_to_marketplace') {
        const existing = await base44.asServiceRole.entities.GallerySubmission.filter({ kind: body.kind, source: 'giphy', source_id: gifId }, '-created_date', 1);
        const prior = Array.isArray(existing) ? existing[0] : existing?.items?.[0];
        if (prior) return Response.json({ id: prior.id, item: prior, alreadyAdded: true });
      }
      const endpoint = body.action === 'giphy_search' ? (typeof body.query === 'string' && body.query.trim() ? 'search' : 'trending') : encodeURIComponent(gifId);
      const params = new URLSearchParams({ api_key: key, rating: 'g', limit: '24' });
      if (body.action === 'giphy_search' && endpoint === 'search') params.set('q', body.query.trim().slice(0,80));
      const response = await fetch('https://api.giphy.com/v1/gifs/' + endpoint + '?' + params, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return Response.json({ error: 'GIPHY is temporarily unavailable.' }, { status: 503 });
      const payload = await response.json();
      const cleanGif = gif => {
        const id = String(gif?.id || '');
        const originalUrl = gif?.images?.original?.url || '';
        const preview = gif?.images?.fixed_width_small?.url || gif?.images?.fixed_width?.url || '';
        let media, source;
        try { media = new URL(originalUrl); source = new URL(gif?.url || ''); } catch { return null; }
        if (!/^[a-zA-Z0-9]{1,64}$/.test(id) || gif.rating !== 'g' || media.protocol !== 'https:' || !media.hostname.endsWith('.giphy.com') || source.protocol !== 'https:' || !(source.hostname === 'giphy.com' || source.hostname.endsWith('.giphy.com')) || !/^https:\/\/[^/]+\.giphy\.com\//i.test(preview)) return null;
        return { id, title: String(gif.title || 'GIPHY GIF').slice(0,100), preview, gifUrl: originalUrl, creatorName: String(gif.username || '').slice(0,80), sourceUrl: source.href };
      };
      if (body.action === 'giphy_search') return Response.json({ items: (payload.data || []).map(cleanGif).filter(Boolean) });
      const gif = cleanGif(payload.data);
      if (!gif || gif.id !== gifId) return Response.json({ error: 'That GIPHY item is unavailable or not rated for general audiences.' }, { status: 422 });
      const kind = body.kind;
      const item = await base44.asServiceRole.entities.GallerySubmission.create({
        uploader_id: user.id, name: gif.title, url: gif.gifUrl, gif_url: gif.gifUrl, kind, status: 'approved',
        source: 'giphy', source_id: gif.id, creator_name: gif.creatorName, source_url: gif.sourceUrl
      });
      return Response.json({ id: item.id, item, alreadyAdded: false });
    }
    if (body.action === 'set_gallery_uploader') {
      if (user.role !== 'admin') return Response.json({error:'Administrator access required.'},{status:403});
      if (typeof body.enabled !== 'boolean' || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.user_id || '')) return Response.json({error:'Invalid member or role.'},{status:400});
      const target = await base44.asServiceRole.entities.User.update(body.user_id,{gallery_uploader:body.enabled});
      return Response.json({gallery_uploader:target.gallery_uploader});
    }
    if (body.action === 'submit_gallery_design') {
      if (user.gallery_uploader !== true) return Response.json({error:'Gallery Uploader access required.'},{status:403});
      const name = typeof body.name === 'string' ? body.name.trim().slice(0,80) : '';
      const url = typeof body.url === 'string' && body.url.length <= 2048 ? new URL(body.url) : null;
      const prefix = '/api/apps/6a5676aa61ea8a51237aa4ee/files/public/';
      if (body.rightsConfirmed !== true || !name || !['avatar','banner'].includes(body.kind) || !url || url.protocol !== 'https:' || !['base44.app','publicnet.base44.app','media.base44.com'].includes(url.hostname) || !(url.hostname === 'media.base44.com' ? url.pathname.startsWith('/images/public/6a5676aa61ea8a51237aa4ee/') : url.pathname.startsWith(prefix))) {
        return Response.json({error:'Choose a valid gallery image.'},{status:400});
      }
      const item = await base44.asServiceRole.entities.GallerySubmission.create({uploader_id:user.id,name,url:url.href,kind:body.kind,status:'pending'});
      return Response.json({id:item.id});
    }
    if (body.action === 'set_friends_family_badge') {
      if (user.role !== 'admin') return Response.json({ error: 'Administrator access required.' }, { status: 403 });
      if (typeof body.user_id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.user_id) || !['friends_family','listener','uploader','artist'].includes(body.creator_role)) {
        return Response.json({ error: 'Choose a member and badge state.' }, { status: 400 });
      }
      const entities = base44.asServiceRole.entities;
      const target = await entities.User.get(body.user_id);
      if (!target || target.role === 'admin') return Response.json({ error: 'Administrators keep their existing role.' }, { status: 400 });
      const friendsFamily = body.creator_role === 'friends_family';
      if (body.creator_role === 'artist') {
        const result = await entities.ArtistApplication.filter({ user_id: target.id }, '-created_date', 100);
        const applications = Array.isArray(result) ? result : result?.items || [];
        if (!applications.some((application) => ['pending', 'approved'].includes(application.status))) {
          return Response.json({ error: 'An artist application is required.' }, { status: 422 });
        }
      }
      // Friends & Family uses the existing non-admin creator permissions.
      const creatorRole = friendsFamily ? 'artist' : body.creator_role;
      const patch = { friends_family_badge: friendsFamily, creator_role: creatorRole, is_artist: creatorRole === 'artist' };
      await entities.User.update(target.id, patch);
      await entities.PublicProfile.updateMany({ user_id: target.id }, { $set: patch });
      return Response.json(patch);
    }
    const ids = Array.isArray(body?.ids)
      ? [...new Set(body.ids.filter((i) => typeof i === 'string' && i))].slice(0, 200)
      : [];
    if (!ids.length) return Response.json({ users: [] });

    let rows=[];
    try{
      const page=await base44.asServiceRole.entities.User.filter({id:{$in:ids}},"-created_date",200);
      rows=Array.isArray(page)?page:page?.items||[];
    }catch{}
    const foundIds=new Set(rows.map(row=>row.id));
    const missing=ids.filter(id=>!foundIds.has(id));
    // Recover requested IDs in small batches instead of treating a failed query as deleted accounts.
    for(let i=0;i<missing.length;i+=4){
      const recovered=await Promise.all(missing.slice(i,i+4).map(async id=>{
        try{return await base44.asServiceRole.entities.User.get(id);}
        catch(error){if((error.status??error.response?.status)===404)return null;throw error;}
      }));
      rows.push(...recovered.filter(Boolean));
    }

    // Public profile fields only — never email, role, or block status. This is
    // what the profile page renders for a member other than yourself, since the
    // built-in User rules only let admins read other users.
    const users = (rows || []).filter(u=>u&&!u.is_blocked&&!u.disabled).map((u) => ({
      id: u.id,
      username: u.username || '',
      display_name: u.display_name || u.full_name || '',
      full_name: u.full_name || '',
      avatar_url: u.avatar_url || '',
      avatar_preset: u.avatar_preset || '',
      avatar_video_url: u.avatar_video_url || '',
      avatar_gif_url: u.avatar_gif_url || '',
      banner_video_url: u.banner_video_url || '',
      banner_gif_url: u.banner_gif_url || '',
      banner_use_default: u.banner_use_default === true,
      banner_url: u.banner_url || '',
      banner_mobile_url: u.banner_mobile_url || '',
      top_tracks_label: u.top_tracks_label || '',
      bio: u.bio || '',
      location: u.location || '',
      pronouns: u.pronouns || '',
      website: u.website || '',
      instagram: u.instagram || '',
      twitter: u.twitter || '',
      soundcloud: u.soundcloud || '',
      status_message: u.status_message || '',
      featured_track_id: u.featured_track_id || '',
      profile_background_mode: u.profile_background_mode || 'auto',
      profile_background_motion: u.profile_background_motion === 'still' ? 'still' : 'flow',
      profile_background_speed: typeof u.profile_background_speed === 'number' ? Math.max(.35,Math.min(1.6,u.profile_background_speed)) : 1,
      profile_background_colors: Array.isArray(u.profile_background_colors) ? u.profile_background_colors : [],
      top_track_ids: Array.isArray(u.top_track_ids) ? u.top_track_ids : [],
      is_artist: u.role!=='admin' && u.creator_role==='artist',
      creator_role: u.role==='admin'?'listener':['artist','uploader'].includes(u.creator_role)?u.creator_role:'listener',
      is_public_admin: u.role==='admin',
      friends_family_badge: u.friends_family_badge === true,
      created_date: u.created_date || '',
    }));

    const publicFields=["username","display_name","full_name","avatar_url","avatar_preset","avatar_video_url","avatar_gif_url","banner_video_url","banner_gif_url","banner_url","banner_mobile_url","banner_use_default","top_tracks_label","bio","location","pronouns","website","instagram","twitter","soundcloud","status_message","featured_track_id","profile_background_mode","profile_background_colors","profile_background_motion","profile_background_speed","top_track_ids","is_artist","creator_role","is_public_admin","friends_family_badge"];
    await Promise.allSettled(users.map(async profile=>{
      const page=await base44.asServiceRole.entities.PublicProfile.filter({user_id:profile.id},'-updated_date',1);
      const data={...Object.fromEntries(publicFields.filter(key=>profile[key]!==undefined).map(key=>[key,profile[key]])),user_id:profile.id,joined_at:profile.created_date||"",visible:true};
      if(page[0])await base44.asServiceRole.entities.PublicProfile.update(page[0].id,data);
      else await base44.asServiceRole.entities.PublicProfile.create(data);
    }));
    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
// Register the HTTP handler in Base44’s Deno runtime.
if (typeof Deno !== "undefined") Deno.serve(handleRequest);

