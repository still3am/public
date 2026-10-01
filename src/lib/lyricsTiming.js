// Timing helpers for karaoke-style lyrics.
//
// Timed lyrics arrive in the usual .lrc shape ("[1:04.20] line"), as bare
// "1:04 line" stamps, or from tapping along to the track in the sync editor.

const BRACKET_STAMP = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const BARE_STAMP = /^(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\s+(.+)$/;

const toMs = (min, sec, frac) =>
  Math.round((Number(min) * 60 + Number(sec) + (frac ? Number(`0.${frac}`) : 0)) * 1000);

// -> [{ text, start_time_ms }], start_time_ms null for lines with no stamp.
export function parseTimedLyrics(text) {
  const out = [];
  (text || "").split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line) return;

    const stamps = [...line.matchAll(BRACKET_STAMP)];
    if (stamps.length) {
      const body = line.replace(BRACKET_STAMP, "").trim();
      stamps.forEach((m) => out.push({ text: body, start_time_ms: toMs(m[1], m[2], m[3]) }));
      return;
    }

    const bare = line.match(BARE_STAMP);
    if (bare) {
      out.push({ text: bare[4].trim(), start_time_ms: toMs(bare[1], bare[2], bare[3]) });
      return;
    }

    out.push({ text: line, start_time_ms: null });
  });
  return out;
}

export const hasTiming = (lines) => !!lines?.some((l) => l.start_time_ms != null);

// Each line runs until the next one starts; the last one gets the rest of the
// track, or a 6s tail when the duration isn't known.
export function withEndTimes(lines, totalSeconds = 0) {
  const timed = (lines || [])
    .filter((l) => l.start_time_ms != null)
    .sort((a, b) => a.start_time_ms - b.start_time_ms);
  const totalMs = totalSeconds ? Math.round(totalSeconds * 1000) : 0;

  return timed.map((l, i) => {
    const next = timed[i + 1]?.start_time_ms;
    let end = next != null && next > l.start_time_ms ? next : l.start_time_ms + 6000;
    if (i === timed.length - 1 && totalMs > l.start_time_ms) {
      end = Math.max(l.start_time_ms + 1500, totalMs);
    }
    return { text: l.text, start_time_ms: l.start_time_ms, end_time_ms: end };
  });
}

export function formatStamp(ms) {
  if (ms == null) return "--:--";
  const total = ms / 1000;
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${m}:${s < 10 ? "0" : ""}${s.toFixed(1)}`;
}