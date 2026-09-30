import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// The tracks this user has liked. Likes are personal records, so they are read
// once and shared app-wide — a Like record is also what makes Like/Unlike show
// the right label inside every track menu without a request per menu.
const EVENT = "public:likes";
let ids = new Set();
let loaded = false;
let loading = null;
let currentUser = "";

function emit() {
  window.dispatchEvent(new Event(EVENT));
}

export async function ensureLikesLoaded(userId) {
  if (!userId) {
    ids = new Set();
    loaded = false;
    emit();
    return;
  }
  if (loaded && currentUser === userId) return;
  if (loading && currentUser === userId) return loading;
  currentUser = userId;
  loading = base44.entities.Like
    .filter({ user_id: userId }, "-created_date", 1000)
    .then((rows) => {
      ids = new Set((rows || []).map((r) => r.track_id).filter(Boolean));
      loaded = true;
    })
    .catch(() => {})
    .finally(() => {
      loading = null;
      emit();
    });
  return loading;
}

export function isTrackLiked(trackId) {
  return ids.has(trackId);
}

export async function toggleTrackLike(track, userId) {
  if (!track?.id || !userId) return null;
  const next = !ids.has(track.id);
  // Optimistic so the menu flips instantly; the server call is the truth.
  ids = new Set(ids);
  if (next) ids.add(track.id);
  else ids.delete(track.id);
  emit();
  try {
    const res = await base44.functions.invoke("trackLike", {
      track_id: track.id,
      like: next,
    });
    return typeof res?.data?.like_count === "number" ? res.data.like_count : null;
  } catch {
    ids = new Set(ids);
    if (next) ids.delete(track.id);
    else ids.add(track.id);
    emit();
    return false;
  }
}

export function useLikedTracks(userId) {
  const [, force] = useState(0);
  useEffect(() => {
    ensureLikesLoaded(userId);
    const onChange = () => force((n) => n + 1);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [userId]);
  return { isLiked: (id) => ids.has(id) };
}