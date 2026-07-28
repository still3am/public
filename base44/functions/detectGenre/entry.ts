import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const GENRES = [
  "Pop", "Hip-Hop", "Electronic", "Rock", "R&B", "Jazz", "Classical", "Ambient",
  "Experimental", "Dance", "Indie", "Folk", "Country", "Metal", "Punk", "Lo-Fi",
  "Soul", "Funk", "Techno", "House", "Trap", "Latin", "Reggae", "World", "Other",
  "Afro-Pop", "Amapiano", "Afrobeats", "K-Pop", "J-Pop", "Bollywood", "Reggaeton",
  "Dancehall", "Drill", "Phonk", "Hyperpop", "Drum & Bass", "Trance", "Disco",
  "Synthwave", "Vaporwave", "Jersey Club", "Bossa Nova", "Gospel", "Chill",
  "Garage", "Hardcore", "Bedroom Pop", "Pop Punk", "Worship",
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const trackId = body?.track_id;
    if (!trackId) return Response.json({ error: 'track_id is required' }, { status: 400 });

    const track = await base44.entities.Track.get(trackId).catch(() => null);
    if (!track) return Response.json({ error: 'Track not found' }, { status: 404 });
    if (track.uploader_id !== user.id) {
      return Response.json({ error: 'Only the track owner can detect genre' }, { status: 403 });
    }

    const info = [];
    if (track.title) info.push(`Title: ${track.title}`);
    if (track.artist) info.push(`Artist: ${track.artist}`);
    if (track.description) info.push(`Description: ${track.description}`);
    if (track.lyrics_text) info.push(`Lyrics excerpt: ${track.lyrics_text.slice(0, 1500)}`);
    const context = info.join('\n') || 'No metadata available.';

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt:
        "You are a music genre classifier. Based on the track metadata below, choose the single most accurate genre from this exact list:\n" +
        GENRES.join(', ') +
        "\n\nReply with ONLY a JSON object of the form {\"genre\": \"<one genre from the list>\"}. " +
        "If you cannot confidently determine the genre, use \"Other\".\n\nMetadata:\n" +
        context,
      response_json_schema: {
        type: "object",
        properties: { genre: { type: "string" } },
        required: ["genre"],
      },
    });

    let genre = typeof res === 'string' ? (() => { try { return JSON.parse(res)?.genre; } catch { return undefined; } })() : res?.genre;
    if (typeof genre === 'string') genre = genre.trim();
    if (!genre || !GENRES.includes(genre)) genre = 'Other';

    await base44.entities.Track.update(trackId, { genre });
    return Response.json({ genre });
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to detect genre' }, { status: 500 });
  }
}