import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const GENRES = [
  "Pop", "Hip-Hop", "Electronic", "Rock", "R&B", "Jazz", "Classical", "Ambient",
  "Experimental", "Dance", "Indie", "Folk", "Country", "Metal", "Punk", "Lo-Fi",
  "Soul", "Funk", "Techno", "House", "Trap", "Latin", "Reggae", "World", "Other",
  "Afro-Pop", "Amapiano", "Afrobeats", "K-Pop", "J-Pop", "Bollywood", "Reggaeton",
  "Dancehall", "Drill", "Phonk", "Hyperpop", "Drum & Bass", "Trance", "Disco",
  "Synthwave", "Vaporwave", "Jersey Club", "Bossa Nova", "Gospel", "Chill",
  "Garage", "Hardcore", "Bedroom Pop", "Pop Punk", "Worship",
  "Sexy Drill", "UK Drill", "Brooklyn Drill", "Chicago Drill", "NY Drill",
  "Arabic Drill", "Afro Drill",
  "Gengetone", "Alté", "Gqom", "3-Step", "Singeli", "Bongo Flava",
  "Maskandi", "Afrosoul",
  "Baile Funk", "Funk Carioca", "Cumbia", "Bachata", "Merengue", "Salsa",
  "Sertanejo", "Forró", "Tango", "Bolero", "Mariachi", "Ranchera",
  "Latin Pop", "Latin Trap", "Urbano",
  "City Pop", "C-Pop", "T-Pop", "Mandopop", "Pinoy Pop", "Punjabi",
  "Tamil", "Bhangra", "Dangdut",
  "Dream Pop", "Shoegaze", "Post-Punk", "Emo", "Ska", "Grunge",
  "J-Rock", "K-Rock",
  "Neo-Soul", "Crunk", "Memphis Rap", "Cloud Rap", "Trap Metal",
  "Slowed & Reverb", "Sped Up",
  "Zouk", "Kompa", "Kizomba",
  "Fado", "Arabic Pop", "Persian Pop", "Turkish Pop",
];

const BATCH = 12;
const TIME_BUDGET_MS = 50000;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const force = !!body?.force;

    const query = force
      ? {}
      : { $or: [ { genre: 'Other' }, { genre: '' }, { genre: { $exists: false } } ] };

    let processed = 0;
    let has_more = false;
    const start = Date.now();

    while (Date.now() - start < TIME_BUDGET_MS) {
      let tracks = [];
      try {
        tracks = await base44.asServiceRole.entities.Track.filter(query, '-created_date', BATCH);
      } catch {
        tracks = await base44.asServiceRole.entities.Track.filter(
          { genre: 'Other' }, '-created_date', BATCH
        );
      }
      if (!tracks.length) { has_more = false; break; }
      has_more = tracks.length >= BATCH;

      for (const track of tracks) {
        const info = [];
        if (track.title) info.push(`Title: ${track.title}`);
        if (track.artist) info.push(`Artist: ${track.artist}`);
        if (track.description) info.push(`Description: ${track.description}`);
        if (track.lyrics_text) info.push(`Lyrics excerpt: ${String(track.lyrics_text).slice(0, 1500)}`);
        const context = info.join('\n') || 'No metadata available.';

        let genre = 'Other';
        try {
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
          if (typeof res === 'string') {
            try { genre = JSON.parse(res)?.genre || 'Other'; } catch {}
          } else if (res?.genre) {
            genre = res.genre;
          }
        } catch {}
        if (typeof genre === 'string') genre = genre.trim();
        if (!genre || !GENRES.includes(genre)) genre = 'Other';

        if (genre !== track.genre) {
          await base44.asServiceRole.entities.Track.update(track.id, { genre });
        }
        processed++;

        if (Date.now() - start >= TIME_BUDGET_MS) break;
      }
    }

    return Response.json({ processed, has_more });
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to classify genres' }, { status: 500 });
  }
}