// Per-device listening counts. recentPlays only keeps the last 20 tracks the
// user touched; this keeps how many times each was played, which is what the
// "On Repeat" shelf is built from. Slim track objects are stored alongside the
// count so the shelf renders without a lookup.

import { slimTrack } from "@/lib/recentPlays";

const KEY = "public:play_counts";
const MAX = 80;

export function getPlayCounts() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

/** Count one play of a track. Safe to call on every track change. */
export function recordPlay(track) {
  if (!track?.id) return;
  try {
    const all = getPlayCounts();
    const prev = all[track.id] || {};
    all[track.id] = {
      count: (prev.count || 0) + 1,
      at: Date.now(),
      track: slimTrack(track) || prev.track || null,
    };
    // Keep the store from growing forever — drop the least recently touched.
    const entries = Object.entries(all)
      .sort((a, b) => (b[1].at || 0) - (a[1].at || 0))
      .slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
    window.dispatchEvent(new CustomEvent("playcounts:change"));
  } catch {}
}

/** Tracks the user has genuinely repeated, most played first. */
export function getOnRepeat(limit = 12) {
  return Object.values(getPlayCounts())
    .filter((e) => e?.track && (e.count || 0) >= 2)
    .sort((a, b) => (b.count || 0) - (a.count || 0) || (b.at || 0) - (a.at || 0))
    .slice(0, limit)
    .map((e) => e.track);
}