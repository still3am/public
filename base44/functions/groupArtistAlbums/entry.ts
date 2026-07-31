import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const splitNames = (str) =>
  (str || "")
    .split(/\s*(?:,|&| feat\.| ft\.| x |;)\s*/i)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const artistId = body?.artist_id;
    if (!artistId) return Response.json({ error: 'artist_id is required' }, { status: 400 });

    const artist = await base44.entities.Artist.get(artistId).catch(() => null);
    if (!artist) return Response.json({ error: 'Artist not found' }, { status: 404 });

    const targetNames = splitNames(artist.name);
    if (!targetNames.length) return Response.json({ error: 'Artist has no name' }, { status: 400 });

    // Fetch all published tracks and keep those linked to this artist (same
    // fuzzy split-name matching used on the Public Record page). We only
    // consider tracks NOT already assigned to an album so an admin's manual
    // curation is never overwritten.
    const all = await base44.asServiceRole.entities.Track
      .filter({ is_published: true }, '-created_date', 10000)
      .catch(() => []);
    const tracks = (Array.isArray(all) ? all : []).filter((t) => {
      if (t.album_id) return false; // already grouped
      return splitNames(t.artist).some((n) => targetNames.includes(n));
    });

    if (!tracks.length) {
      return Response.json({ message: 'No unassigned tracks to group', albums: [], grouped: 0, skipped: 0 });
    }

    const trackList = tracks.map((t) => ({
      track_id: t.id,
      title: t.title,
      artist: t.artist || artist.name,
    }));

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      prompt:
        "You are a music metadata librarian. Below is a list of songs by a single artist, each with an internal track_id. " +
        "Using reliable information found on the web (MusicBrainz, Discogs, Wikipedia, official sources), determine the " +
        "OFFICIAL studio album each song originally appears on.\n\n" +
        "Rules:\n" +
        "- Prefer full-length studio albums over singles, EPs, compilations, or 'Greatest Hits' packages. If a track is only released as a standalone single, put its track_id in `unmatched`.\n" +
        "- Use the canonical album title as released in the artist's primary market.\n" +
        "- Assign a track_number reflecting the track's order on that album (1-based).\n" +
        "- Group all tracks that belong to the same album together under one album entry.\n" +
        "- Every track_id from the input must appear exactly once: either inside an album's tracks array OR in unmatched. Never invent track_ids.\n\n" +
        "Artist: " + artist.name + "\n\n" +
        "Tracks (JSON): " + JSON.stringify(trackList),
      response_json_schema: {
        type: "object",
        properties: {
          albums: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                year: { type: "string" },
                tracks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      track_id: { type: "string" },
                      track_number: { type: "integer" }
                    },
                    required: ["track_id"]
                  }
                }
              },
              required: ["title", "tracks"]
            }
          },
          unmatched: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["albums", "unmatched"]
      }
    });

    let result = typeof llm === 'string'
      ? (() => { try { return JSON.parse(llm); } catch { return undefined; } })()
      : llm;
    if (!result || !Array.isArray(result.albums)) {
      return Response.json({ error: "AI didn't return a valid grouping" }, { status: 422 });
    }

    // Build a set of track_ids we actually have so the LLM can't map to foreign ids.
    const knownIds = new Set(tracks.map((t) => t.id));

    // Find or create albums, then bulk-update the assigned tracks.
    const existing = await base44.asServiceRole.entities.Album
      .filter({ artisan: artist.name }, '-created_date', 200)
      .catch(() => []);
    const existingByTitle = new Map(
      (Array.isArray(existing) ? existing : []).map((a) => [(a.title || '').toLowerCase(), a])
    );

    let grouped = 0;
    let skipped = 0;
    const albumResults = [];

    for (const al of result.albums) {
      const title = (al.title || '').trim();
      if (!title || !Array.isArray(al.tracks) || !al.tracks.length) continue;

      const key = title.toLowerCase();
      let album = existingByTitle.get(key);
      if (!album) {
        album = await base44.entities.Album.create({
          title,
          creator_id: user.id,
          artisan: artist.name,
          description: al.year ? `Released ${al.year}` : 'Auto-grouped from official discography',
        }).catch(() => null);
        if (album) existingByTitle.set(key, album);
      }

      if (!album) { skipped += al.tracks.length; continue; }

      const updates = [];
      for (const tr of al.tracks) {
        if (!knownIds.has(tr.track_id)) { skipped++; continue; }
        updates.push({
          id: tr.track_id,
          album_id: album.id,
          track_number: Number.isFinite(tr.track_number) ? tr.track_number : 0,
        });
        knownIds.delete(tr.track_id);
      }
      if (updates.length) {
        await base44.asServiceRole.entities.Track.bulkUpdate(updates).catch(() => {});
        grouped += updates.length;
        albumResults.push({ title, album_id: album.id, count: updates.length });
      }
    }

    // Any remaining knownIds are unmatched singles — left untouched.
    const unmatchedCount = knownIds.size;

    return Response.json({
      albums: albumResults,
      grouped,
      skipped,
      unmatched: unmatchedCount,
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to group albums' }, { status: 500 });
  }
}