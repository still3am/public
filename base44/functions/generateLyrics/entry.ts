import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const trackId = body?.track_id;
    if (!trackId) return Response.json({ error: 'track_id is required' }, { status: 400 });

    const track = await base44.entities.Track.get(trackId).catch(() => null);
    if (!track) return Response.json({ error: 'Track not found' }, { status: 404 });
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
});