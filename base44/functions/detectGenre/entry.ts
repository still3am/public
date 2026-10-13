import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const GENRES = [
  "Pop",
  "Hip-Hop",
  "R&B",
  "Soul",
  "Funk",
  "Dance",
  "Electronic",
  "Techno",
  "House",
  "Trap",
  "Disco",
  "Rock",
  "Alternative",
  "Indie",
  "Punk",
  "Metal",
  "Country",
  "Folk",
  "Blues",
  "Jazz",
  "Classical",
  "Ambient",
  "Reggae",
  "Latin",
  "World",
  "K-Pop",
  "J-Pop",
  "Singer/Songwriter",
  "Soundtrack",
  "Easy Listening",
  "Holiday",
  "Christian & Gospel",
  "Children's Music",
  "Comedy",
  "Spoken Word",
  "Fitness & Workout",
  "Sexy Drill",
  "Drill",
  "New York Drill",
  "Brooklyn Drill",
  "UK Drill",
  "Chicago Drill",
  "Sample Drill",
  "Jersey Club",
  "Baltimore Club",
  "Philly Club",
  "Rap",
  "Boom Bap",
  "Alternative Hip-Hop",
  "Conscious Hip-Hop",
  "Cloud Rap",
  "Emo Rap",
  "PluggnB",
  "Rage",
  "Southern Hip-Hop",
  "West Coast Hip-Hop",
  "Memphis Rap",
  "Phonk",
  "Latin Trap",
  "UK Garage",
  "Grime",
  "Afrobeats",
  "Afrobeat",
  "Afropop",
  "Amapiano",
  "Afro House",
  "Gqom",
  "Highlife",
  "Dancehall",
  "Reggaeton",
  "Dembow",
  "Latin Pop",
  "Latin Rock",
  "Bachata",
  "Salsa",
  "Merengue",
  "Soca",
  "Kompa",
  "Zouk",
  "Reggae Fusion",
  "Dub",
  "Bossa Nova",
  "Samba",
  "Brazilian Funk",
  "Corridos",
  "Regional Mexican",
  "Neo-Soul",
  "Alternative R&B",
  "Contemporary R&B",
  "New Jack Swing",
  "Gospel",
  "Deep House",
  "Tech House",
  "Progressive House",
  "Minimal House",
  "Trance",
  "Drum & Bass",
  "Jungle",
  "Dubstep",
  "Bass",
  "Breakbeat",
  "Electro",
  "IDM",
  "Synthwave",
  "Downtempo",
  "Trip-Hop",
  "Lo-Fi",
  "Lo-Fi Hip-Hop",
  "Chillout",
  "Hardstyle",
  "Hyperpop",
  "Dance-Pop",
  "Indie Pop",
  "Synth-Pop",
  "Afro Swing",
  "Indie Rock",
  "Alternative Rock",
  "Hard Rock",
  "Pop Punk",
  "Post-Punk",
  "Emo",
  "Shoegaze",
  "Dream Pop",
  "Grunge",
  "Post-Rock",
  "Metalcore",
  "Death Metal",
  "Heavy Metal",
  "Acoustic",
  "Americana",
  "Bluegrass",
  "Contemporary Country",
  "Smooth Jazz",
  "Jazz Fusion",
  "Jazz Rap",
  "Bebop",
  "Experimental",
  "Instrumental",
  "Orchestral",
  "Opera",
  "New Age",
  "Meditation",
  "Bollywood",
  "Desi Hip-Hop",
  "Bhangra",
  "K-R&B",
  "K-Hip-Hop",
  "J-Rock",
  "Other"
];

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

    await base44.asServiceRole.entities.Track.update(trackId, { genre });
    return Response.json({ genre });
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to detect genre' }, { status: 500 });
  }
}
// Register the HTTP handler in Base44’s Deno runtime.
if (typeof Deno !== "undefined") Deno.serve(handleRequest);
