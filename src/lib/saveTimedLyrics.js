const rows = value => Array.isArray(value) ? value : value?.items || [];
const fail = message => { throw Object.assign(new Error(message), {status: 422}); };

export function validateTimedLyrics(lines) {
  if (!Array.isArray(lines) || !lines.length || lines.length > 2000) fail("Add between 1 and 2,000 timed lines.");
  let last = -1, length = 0;
  for (const line of lines) {
    if (typeof line?.text !== "string" || !line.text.trim()) fail("Each line needs text.");
    length += line.text.length;
    if (!Number.isSafeInteger(line.start_time_ms) || !Number.isSafeInteger(line.end_time_ms) || line.start_time_ms < 0 || line.start_time_ms < last || line.end_time_ms < line.start_time_ms) fail("Time every line in order before saving.");
    last = line.start_time_ms;
    if (line.words !== undefined && !Array.isArray(line.words)) fail("Invalid word timing.");
    let wordEnd = line.start_time_ms;
    for (const word of line.words || []) {
      if (typeof word?.text !== "string" || !word.text.trim() || !Number.isSafeInteger(word.start_time_ms) || !Number.isSafeInteger(word.end_time_ms) || word.start_time_ms < wordEnd || word.end_time_ms < word.start_time_ms || word.end_time_ms > line.end_time_ms) fail("Word timing must stay within its line.");
      wordEnd = word.end_time_ms;
    }
  }
  if (length > 100000) fail("Lyrics must be under 100,000 characters.");
  return lines.map(line => ({
    text: line.text, start_time_ms: line.start_time_ms, end_time_ms: line.end_time_ms,
    ...(line.words ? {words: line.words.map(word => ({text: word.text, start_time_ms: word.start_time_ms, end_time_ms: word.end_time_ms}))} : {})
  }));
}

// Native writes are restricted by the existing administrator-only Lyrics RLS.
// Regular song owners continue through the server's ownership and moderation checks.
export async function saveTimedLyrics(client, input, protectedWrite) {
  const {trackId, recordId, language = "en"} = input;
  if (typeof trackId !== "string" || !trackId) fail("Choose a song before saving.");
  if (typeof language !== "string" || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(language)) fail("Choose a valid lyrics language.");
  const lines = validateTimedLyrics(input.lines);
  const user = await client.auth.me();
  if (!user?.id || user.disabled || user.is_blocked) throw new Error("Sign in with an active account before saving lyrics.");
  const track = await client.entities.Track.get(trackId);
  if (!track?.id || user.role !== "admin" && track.uploader_id !== user.id) throw new Error("Only the song owner or an administrator can sync lyrics.");
  const records = rows(await client.entities.Lyrics.filter({track_id: trackId, uploader_id: user.id}, "-updated_date", 100));
  const existing = recordId ? await client.entities.Lyrics.get(recordId) : records[0];
  if (existing && (existing.track_id !== trackId || user.role !== "admin" && existing.uploader_id !== user.id)) throw new Error("These lyrics belong to another song or account.");
  const payload = {track_id: trackId, uploader_id: user.id, language_code: language, lines, status: "approved", out_of_sync: false};
  const same = row => {
    try { return row?.track_id === trackId && row.language_code === language && row.status === "approved" && row.out_of_sync === false && JSON.stringify(validateTimedLyrics(row.lines)) === JSON.stringify(lines); }
    catch { return false; }
  };
  if ((await client.auth.me())?.id !== user.id) throw new Error("Your account changed. Reopen the lyrics before saving.");
  let saved, failure;
  try {
    saved = user.role === "admin"
      ? existing ? await client.entities.Lyrics.update(existing.id, payload) : await client.entities.Lyrics.create(payload)
      : await protectedWrite(existing ? "update" : "create", existing ? [existing.id, payload] : [payload]);
  } catch (error) { failure = error; }
  if ((await client.auth.me())?.id !== user.id) throw new Error("Your account changed. Reopen the lyrics to check the save.");
  let confirmed;
  if (existing?.id || saved?.id) confirmed = await client.entities.Lyrics.get(existing?.id || saved.id);
  else confirmed = rows(await client.entities.Lyrics.filter({track_id: trackId, uploader_id: user.id}, "-updated_date", 100)).find(same);
  if (!same(confirmed)) throw failure || new Error("Your timing was not confirmed. Your draft is still here; please retry.");
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("lyrics:changed", {detail: {trackId}}));
  return confirmed;
}
