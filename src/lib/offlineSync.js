// Cloud mirror of the user's offline list. The actual audio blobs stay on each
// device (they're too large for the database), but this list of track metadata
// syncs across devices so each one knows which songs to auto-download.
import { base44 } from "@/api/base44Client";

// Minimal track shape — only what downloadTrack needs to fetch + cache a file.
function minTrack(t) {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    uploader_id: t.uploader_id,
    uploader_name: t.uploader_name,
    cover_art_url: t.cover_art_url,
    audio_url: t.audio_url,
    duration_seconds: t.duration_seconds,
    genre: t.genre,
    explicit: !!t.explicit,
    is_downloadable: !!t.is_downloadable,
  };
}

export async function getCloudList(userId) {
  if (!userId) return [];
  try {
    const rows = await base44.entities.OfflineSync.filter(
      { user_id: userId },
      "-updated_date",
      1
    );
    const row = rows?.[0];
    if (!row || !row.tracks) return [];
    const parsed = JSON.parse(row.tracks);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setCloudList(userId, tracks) {
  if (!userId) return;
  try {
    const rows = await base44.entities.OfflineSync.filter(
      { user_id: userId },
      "-updated_date",
      1
    );
    const payload = { user_id: userId, tracks: JSON.stringify(tracks || []) };
    if (rows?.[0]) {
      await base44.entities.OfflineSync.update(rows[0].id, payload);
    } else {
      await base44.entities.OfflineSync.create(payload);
    }
  } catch {
    /* best-effort */
  }
}

let serial=Promise.resolve();
export function addCloudTrack(userId,track){const next=serial.catch(()=>{}).then(()=>addCloudTrackImpl(userId,track));serial=next;return next;}
async function addCloudTrackImpl(userId, track) {
  if (!userId || !track?.id) return;
  const list = await getCloudList(userId);
  if (list.some((t) => t.id === track.id)) return;
  list.push(minTrack(track));
  await setCloudList(userId, list);
}

export function removeCloudTrack(userId,id){const next=serial.catch(()=>{}).then(()=>removeCloudTrackImpl(userId,id));serial=next;return next;}
async function removeCloudTrackImpl(userId, id) {
  if (!userId || !id) return;
  const list = await getCloudList(userId);
  const next = list.filter((t) => t.id !== id);
  await setCloudList(userId, next);
}