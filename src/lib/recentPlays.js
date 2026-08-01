// Persists the user's most recently played tracks in localStorage.
// PlayerContext writes here; Home reads via the "recentplays:change" custom
// event so the "Recently Played" row updates live within the same tab.

const KEY = "public:recently_played";
const MAX = 20;

function slim(track) {
  if (!track) return null;
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    uploader_name: track.uploader_name,
    uploader_id: track.uploader_id,
    cover_art_url: track.cover_art_url,
    audio_url: track.audio_url,
    duration_seconds: track.duration_seconds,
    genre: track.genre,
    explicit: track.explicit,
    is_published: true,
  };
}

export function getRecentPlays() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

const COUNTS_KEY = "public:listen_counts";

export function getTopListened(limit = 5) {
  try {
    const map = JSON.parse(localStorage.getItem(COUNTS_KEY) || "{}");
    return Object.values(map).
    filter((e) => e?.track?.id).
    sort((a, b) => (b.count || 0) - (a.count || 0)).
    slice(0, limit).
    map((e) => ({ ...e.track, listen_count: e.count }));
  } catch {
    return [];
  }
}

function bumpListenCount(s) {
  try {
    const map = JSON.parse(localStorage.getItem(COUNTS_KEY) || "{}");
    const prev = map[s.id];
    map[s.id] = { track: s, count: (prev?.count || 0) + 1 };
    localStorage.setItem(COUNTS_KEY, JSON.stringify(map));
  } catch {}
}

export function addRecentPlay(track) {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    const s = slim(track);
    if (!s) return v;
    bumpListenCount(s);
    const next = [s, ...v.filter((t) => t.id !== s.id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("recentplays:change"));
    return next;
  } catch {
    return [];
  }
}

export function clearRecentPlays() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent("recentplays:change"));
  } catch {}
}