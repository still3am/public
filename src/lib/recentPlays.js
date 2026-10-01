// Persists the user's most recently played tracks in localStorage, counting how
// many times each one has been played so the "On Repeat" row knows what the
// listener actually keeps coming back to.
// PlayerContext writes here via addRecentPlay(); Home and Library read the list,
// re-reading on the "recentplays:change" event so the rows stay live.

const KEY = "public:recently_played";
const MAX = 50;

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

export function addRecentPlay(track) {
  try {
    const v = getRecentPlays();
    const s = slim(track);
    if (!s) return v;
    const previous = v.find((t) => t.id === s.id);
    const next = [
      { ...s, plays: (previous?.plays || 0) + 1, last_played_at: Date.now() },
      ...v.filter((t) => t.id !== s.id),
    ].slice(0, MAX);
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

// The tracks this listener has deliberately come back to, heaviest first.
export function getOnRepeat(minPlays = 2, limit = 12) {
  return getRecentPlays()
    .filter((t) => (t.plays || 0) >= minPlays)
    .sort((a, b) => (b.plays || 0) - (a.plays || 0))
    .slice(0, limit);
}