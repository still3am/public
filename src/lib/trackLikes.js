import { base44 } from "@/api/base44Client";

// The signed-in user's liked track ids, held once per session so every surface
// can show the real Like / Unlike state without a query per menu.
let likedIds = new Set();
let loadedForUser = null;
let inflight = null;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeLikes(fn) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isTrackLiked(trackId) {
  return !!trackId && likedIds.has(trackId);
}

export async function ensureLikesLoaded(userId) {
  if (!userId) {
    likedIds = new Set();
    loadedForUser = null;
    emit();
    return;
  }
  if (loadedForUser === userId) return;
  if (!inflight) {
    inflight = base44.entities.Like.
    filter({ user_id: userId }, "-created_date", 500).
    catch(() => []);
  }
  const rows = await inflight;
  inflight = null;
  if (loadedForUser === userId) return;
  likedIds = new Set((rows || []).map((r) => r.track_id).filter(Boolean));
  loadedForUser = userId;
  emit();
}

/**
 * Likes / unlikes a track for the signed-in user: writes the Like row, keeps the
 * track's like_count honest, and updates the shared set so every other menu on
 * screen reflects the new state immediately.
 */
export async function toggleTrackLike(track, userId) {
  if (!track?.id || !userId) return null;
  await ensureLikesLoaded(userId);
  const wasLiked = likedIds.has(track.id);

  // Optimistic flip so the menu responds instantly.
  if (wasLiked) likedIds.delete(track.id);
  else likedIds.add(track.id);
  emit();

  try {
    // The Like row and the track's counter are written by a backend function —
    // a track can only be updated by its uploader or an admin, so a listener's
    // like has to go through the service role.
    const res = await base44.functions.invoke("trackLike", { track_id: track.id });
    const liked = res?.data?.liked ?? !wasLiked;
    if (liked !== !wasLiked) {
      if (liked) likedIds.add(track.id);
      else likedIds.delete(track.id);
      emit();
    }
    track.like_count = Math.max(0, (track.like_count || 0) + (liked ? 1 : -1));
    return liked;
  } catch (e) {
    if (wasLiked) likedIds.add(track.id);
    else likedIds.delete(track.id);
    emit();
    throw e;
  }
}