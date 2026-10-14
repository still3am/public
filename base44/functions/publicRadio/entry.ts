import { createClientFromRequest } from "npm:@base44/sdk";
const pageRows = page => Array.isArray(page) ? page : page?.items || [];
function score(id, day) {
  let hash = 2166136261;
  for (const letter of day + ":" + id) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619);
  return hash >>> 0;
}
export default async function handleRequest(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ code: "sign_in" }, { status: 401 });
    if (user.is_blocked || user.disabled) return Response.json({ code: "unavailable" }, { status: 403 });
    const svc = base44.asServiceRole;
    const now = Date.now(), day = new Date(now).toISOString().slice(0,10);
    const anchor = Date.parse(day + "T00:00:00Z");
    const saved = pageRows(await svc.entities.RadioSchedule.filter({ day_key: day }, "created_date", 1));
    let schedule = saved[0];
    if (!schedule) {
      const catalog = [];
      const query = { is_published: true, approval_status: "approved", explicit: { $ne: true }, duration_seconds: { $gte: 15, $lte: 1800 } };
      for (let skip = 0; skip < 20000; skip += 500) {
        const rows = pageRows(await svc.entities.Track.filter(query, "id", 500, skip, ["id","title","artist","duration_seconds","audio_url","audio_file_uri"]));
        catalog.push(...rows);
        if (rows.length < 500) break;
      }
      const names = new Set();
      const pool = catalog.filter(track => {
        if (!track.audio_url && !track.audio_file_uri) return false;
        const key = String(track.title).trim().toLowerCase() + "|" + String(track.artist).trim().toLowerCase();
        if (names.has(key)) return false;
        names.add(key); return true;
      }).sort((a,b) => score(a.id,day)-score(b.id,day) || a.id.localeCompare(b.id)).slice(0,120);
      if (!pool.length) return Response.json({ server_now: now, slots: [], recent: [] });
      await svc.entities.RadioSchedule.create({ day_key: day, anchor_ms: anchor, entries: pool.map(track => ({ track_id:track.id, duration_seconds:track.duration_seconds })) });
      // Concurrent first listeners converge on the oldest persisted schedule.
      schedule = pageRows(await svc.entities.RadioSchedule.filter({ day_key: day }, "created_date", 1))[0];
    }
    const entries = schedule?.entries || [];
    const total = entries.reduce((sum, entry) => sum + Number(entry.duration_seconds) * 1000, 0);
    if (!total || !Number.isFinite(total)) return Response.json({ code:"unavailable" }, {status:503});
    const elapsed = Math.max(0, now - schedule.anchor_ms), cycle = Math.floor(elapsed / total), inCycle = elapsed % total;
    let accumulated = 0, current = 0;
    for (let index=0; index<entries.length; index++) {
      if (inCycle < accumulated + entries[index].duration_seconds * 1000) { current=index;break; }
      accumulated += entries[index].duration_seconds * 1000;
    }
    const start = schedule.anchor_ms + cycle * total + accumulated;
    const blocks = pageRows(await svc.entities.Block.filter({ $or:[{user_id:user.id},{blocked_user_id:user.id}] }, "-created_date", 5000));
    const hidden = new Set(blocks.map(block => block.user_id===user.id ? block.blocked_user_id : block.user_id));
    const safeTrack = async (entry, sign) => {
      const track = await svc.entities.Track.get(entry.track_id).catch(() => null);
      if (!track || !track.is_published || track.approval_status!=="approved" || track.explicit || hidden.has(track.uploader_id)) return null;
      let url = track.audio_url || "";
      if (sign && track.audio_file_uri) url = (await svc.integrations.Core.CreateFileSignedUrl({file_uri:track.audio_file_uri,expires_in:3600})).signed_url;
      return {id:track.id,title:track.title,artist:track.artist,uploader_id:track.uploader_id,uploader_name:track.uploader_name,genre:track.genre,cover_art_url:track.cover_art_url,audio_url:sign?url:"",_private_audio:!sign&&!!track.audio_file_uri,duration_seconds:entry.duration_seconds,is_published:true,approval_status:"approved",explicit:false,is_downloadable:!!track.is_downloadable};
    };
    const slots = []; let cursor = start;
    for (let step=0; step<7; step++) {
      const entry = entries[(current+step)%entries.length], end = cursor + entry.duration_seconds * 1000;
      slots.push({ start_ms:cursor,end_ms:end,track:await safeTrack(entry,true) });
      cursor = end;
    }
    const recent = []; cursor = start;
    for (let step=1; step<=Math.min(5,entries.length); step++) {
      const entry = entries[(current-step+entries.length)%entries.length];
      cursor -= entry.duration_seconds * 1000;
      if(cursor < schedule.anchor_ms)break;
      recent.push({start_ms:cursor,track:await safeTrack(entry,false)});
    }
    return Response.json({server_now:Date.now(),day_key:day,slots,recent});
  } catch (error) {
    const upstream = Number(error?.response?.status || error?.status);
    return Response.json({code:upstream===402?"credits":"unavailable"},{status:[401,402,403,429].includes(upstream)?upstream:503});
  }
}
Deno.serve(handleRequest);
