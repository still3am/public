const page = value => Array.isArray(value) ? value : value?.items || [];
const pick = (value, keys) => Object.fromEntries(keys.filter(key => value[key] !== undefined).map(key => [key, value[key]]));
const deny = message => { throw Object.assign(new Error(message), {status: 403}); };
const invalid = message => { throw Object.assign(new Error(message), {status: 422}); };

// These three entities already grant native access only to administrators.
// Guests keep the server's membership, block, approval and private-file checks.
export async function loungeAction(client, entity, method, args, protectedCall) {
  const user = await client.auth.me();
  if (!user?.id || user.disabled || user.is_blocked) deny("Sign in with an active account to use lounges.");
  if (user.role !== "admin" || !["get","list","filter","create","update","delete"].includes(method)) return protectedCall();
  const handler = client.entities[entity];
  const checkAccount = async () => { if ((await client.auth.me())?.id !== user.id) deny("Your account changed. Reopen the lounge."); };
  if (["get","list","filter"].includes(method)) {
    const result = await handler[method](...args);
    await checkAccount(); return result;
  }
  const old = method === "create" ? null : await handler.get(args[0]);
  const input = (method === "create" ? args[0] : args[1]) || {};
  let data;
  if (entity === "LoungeSession") {
    if (old?.host_id && old.host_id !== user.id) return protectedCall();
    data = pick(input, ["name","code","is_active","is_playing","position_seconds","current_track_id","current_track","sync_anchor_at"]);
    if (data.name !== undefined && (typeof data.name !== "string" || data.name.length > 60)) invalid("Keep the lounge name under 60 characters.");
    if (data.code !== undefined && (typeof data.code !== "string" || !/^[A-Z2-9]{5,12}$/.test(data.code))) invalid("Invalid lounge code.");
    for (const key of ["is_active","is_playing"]) if (data[key] !== undefined && typeof data[key] !== "boolean") invalid("Invalid lounge playback state.");
    if (data.position_seconds !== undefined && (!Number.isFinite(data.position_seconds) || data.position_seconds < 0)) invalid("Invalid playback position.");
    if (data.sync_anchor_at !== undefined && (typeof data.sync_anchor_at !== "string" || !Number.isFinite(Date.parse(data.sync_anchor_at)))) invalid("Invalid playback time.");
    if (method === "create") {
      if (!data.code) invalid("A lounge code is required.");
      data.host_id = user.id;data.host_name = user.display_name || user.full_name || "";
      if (page(await handler.filter({code: data.code, is_active: true}, "-created_date", 1)).length) invalid("That lounge code is in use. Please retry.");
    }
    if (data.current_track_id) {
      const track = await client.entities.Track.get(data.current_track_id);
      if (!track?.id) invalid("This song is unavailable.");
      // Signing private audio still belongs to the authorized backend.
      if (track.audio_file_uri && !track.audio_url) return protectedCall();
      data.current_track = JSON.stringify(pick(track, ["id","title","artist","uploader_id","uploader_name","cover_art_url","audio_url","duration_seconds","genre","explicit"]));
    } else if (data.current_track_id === "") data.current_track = "";
    else if (data.current_track !== undefined) delete data.current_track;
  } else {
    const sid = input.session_id || old?.session_id;
    const session = sid && await client.entities.LoungeSession.get(sid);
    if (!session || session.host_id !== user.id) return protectedCall();
    if (entity === "LoungeMember") {
      if (method === "create") {
        if (!session.is_active) invalid("This lounge has ended.");
        const existing = page(await handler.filter({session_id: sid, user_id: user.id}, "-created_date", 1))[0];
        if (existing) return existing;
        data = {session_id: sid, user_id: user.id, name: user.display_name || user.full_name || "", role: "host", status: "approved"};
      } else {
        data = pick(input, ["status"]);
        if (method !== "delete" && !["approved","rejected"].includes(data.status)) invalid("Choose approve or decline.");
      }
    } else if (entity === "LoungeQueueItem") {
      if (method !== "delete") {
        if (!session.is_active) invalid("This lounge has ended.");
        const track = await client.entities.Track.get(input.track_id || old?.track_id);
        if (!track?.id || track.uploader_id !== user.id && !(track.is_published && track.approval_status === "approved")) invalid("Choose a published song the host can play.");
        if (track.audio_file_uri && !track.audio_url) return protectedCall();
        data = {session_id: sid, track_id: track.id, track: JSON.stringify(pick(track, ["id","title","artist","uploader_id","uploader_name","cover_art_url","audio_url","duration_seconds","genre","explicit"])), added_by_id: user.id, added_by_name: user.display_name || user.full_name || ""};
      }
    } else return protectedCall();
  }
  await checkAccount();
  if (method === "delete") {const result = await handler.delete(old.id);await checkAccount();return result;}
  let saved, failure;
  try { saved = old ? await handler.update(old.id, data) : await handler.create(data); } catch (error) { failure = error; }
  await checkAccount();
  let confirmed;
  if (old?.id || saved?.id) confirmed = await handler.get(old?.id || saved.id);
  else if (entity === "LoungeSession") confirmed = page(await handler.filter({host_id: user.id, code: data.code, is_active: true}, "-created_date", 1))[0];
  else if (entity === "LoungeMember") confirmed = page(await handler.filter({session_id: data.session_id, user_id: user.id}, "-created_date", 1))[0];
  if (!confirmed || Object.entries(data).some(([key,value]) => JSON.stringify(confirmed[key]) !== JSON.stringify(value))) throw failure || new Error("The lounge change was not confirmed. Please retry.");
  return confirmed;
}
