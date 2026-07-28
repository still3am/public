import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const artistId = body?.artist_id;
    if (!artistId) return Response.json({ error: 'artist_id is required' }, { status: 400 });

    const artist = await base44.entities.Artist.get(artistId).catch(() => null);
    if (!artist) return Response.json({ error: 'Artist not found' }, { status: 404 });

    // Authorization: only the artist's creator or an admin may overwrite its history.
    const isOwner = artist.created_by_id === user.id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hints = [];
    if (artist.name) hints.push(`Artist name: ${artist.name}`);
    if (artist.location) hints.push(`Location: ${artist.location}`);
    if (artist.formed_year) hints.push(`Formed / active since: ${artist.formed_year}`);
    if (artist.members) hints.push(`Members: ${artist.members}`);
    if (artist.bio) hints.push(`Existing bio: ${artist.bio}`);
    const context = hints.join('\n') || 'No metadata available.';

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      prompt:
        "You are a music encyclopedia editor writing a wiki page called \"PUBLIC RECORDS\". " +
        "Using reliable information found on the web, write a concise, factual encyclopedia-style history/biography for the musical artist described below. " +
        "Cover their origin/location, when they started, members, musical style and genre, notable releases or milestones, and key achievements. " +
        "Keep it under 220 words, neutral tone, plain text only (no markdown, no headings, no bullet lists). " +
        "If you cannot find reliable information about this exact artist, write a short neutral note stating that PUBLIC RECORDS has no verified history for this artist yet and that the community can add details.\n\n" +
        "Artist context:\n" + context,
      response_json_schema: {
        type: "object",
        properties: { history: { type: "string" } },
        required: ["history"],
      },
    });

    let history = typeof res === 'string'
      ? (() => { try { return JSON.parse(res)?.history; } catch { return undefined; } })()
      : res?.history;
    if (typeof history === 'string') history = history.trim();
    if (!history) {
      return Response.json({ error: "Couldn't generate a history for this artist" }, { status: 422 });
    }

    await base44.asServiceRole.entities.Artist.update(artistId, {
      history_text: history,
      last_updated_by_id: user.id,
    });

    return Response.json({ history });
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to generate artist history' }, { status: 500 });
  }
}