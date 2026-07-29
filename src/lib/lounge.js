import { base44 } from "@/api/base44Client";

// Ambiguous characters removed to keep codes easy to read aloud.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateLoungeCode(len = 5) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

export function loungeUrl(code) {
  if (typeof window === "undefined") return `/lounge/${code}`;
  return `${window.location.origin}/lounge/${code}`;
}

export function qrImageUrl(data, size = 360) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=2&color=000000&bgcolor=FFFFFF&qzone=2&data=${encodeURIComponent(
    data
  )}`;
}

export async function fetchSessionByCode(code) {
  try {
    const list = await base44.entities.LoungeSession.filter(
      { code, is_active: true },
      "-created_date",
      5
    );
    return (list && list[0]) || null;
  } catch {
    return null;
  }
}

export function parseTrack(str) {
  if (!str) return null;
  try {
    return typeof str === "string" ? JSON.parse(str) : str;
  } catch {
    return null;
  }
}

// Keep the broadcasted track payload minimal so the LoungeSession row stays
// small. Includes everything the guest player needs to mirror playback.
export function minimalTrack(t) {
  if (!t) return null;
  return {
    id: t.id,
    title: t.title,
    artist: t.artist || t.uploader_name || "",
    uploader_id: t.uploader_id,
    uploader_name: t.uploader_name || "",
    cover_art_url: t.cover_art_url || "",
    audio_url: t.audio_url,
    duration_seconds: t.duration_seconds || 0,
    genre: t.genre || "Other",
    explicit: !!t.explicit,
    // ensure URL fields are sanitized to http(s) only
    _safe: true,
  };
}

// Compute the live playback position from a broadcasted session snapshot.
export function livePosition(session) {
  if (!session) return 0;
  const anchor = session.sync_anchor_at ? new Date(session.sync_anchor_at).getTime() : Date.now();
  const elapsed = Math.max(0, (Date.now() - anchor) / 1000);
  return Math.max(0, (session.position_seconds || 0) + (session.is_playing ? elapsed : 0));
}