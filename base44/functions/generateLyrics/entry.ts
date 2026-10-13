import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function handleRequest(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if(user.is_blocked || user.disabled) return Response.json({error:'Account suspended'},{status:403});

    const body = await req.json().catch(() => ({}));
    const trackId = body?.track_id;
    if (!trackId) return Response.json({ error: 'track_id is required' }, { status: 400 });

    const track = await base44.entities.Track.get(trackId).catch(() => null);
    if (!track) return Response.json({ error: 'Track not found' }, { status: 404 });
    if(track.uploader_id!==user.id && user.role!=='admin') return Response.json({error:'Only the owner can transcribe this track'},{status:403});
    if(track.audio_file_uri)track.audio_url=(await base44.integrations.Core.CreateFileSignedUrl({file_uri:track.audio_file_uri,expires_in:3600})).signed_url;
    if (!track.audio_url) {
      return Response.json({ error: 'No audio file attached to this track' }, { status: 400 });
    }

    const transcript = await base44.asServiceRole.integrations.Core.TranscribeAudio({
      audio_url: track.audio_url,
    });

    const lyrics = (typeof transcript === 'string' ? transcript : transcript?.text || '').trim();
    if (!lyrics) {
      return Response.json({
        error: "Couldn't detect any words in this audio — it may be instrumental or the vocals may be too quiet.",
      }, { status: 422 });
    }

    return Response.json({ lyrics });
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to generate lyrics' }, { status: 500 });
  }
}
// Register the HTTP handler in Base44’s Deno runtime.
if (typeof Deno !== "undefined") Deno.serve(handleRequest);
