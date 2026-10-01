// Line and word timings for synchronized lyrics.
//
// The transcription integration returns plain text (no forced alignment), so
// timings are estimated: each line receives a share of the track proportional
// to its length, and each word a share of its line. Stored per-word timings
// (line.words) are always preferred when a lyric has them, so the renderer
// upgrades automatically once real timings exist.
import { base44 } from "@/api/base44Client";

export function splitLyricLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length);
}

export function buildTimedLines(text, durationSeconds, leadInMs = 900) {
  const lines = splitLyricLines(text);
  if (!lines.length) return [];
  const total = Number(durationSeconds) > 0 ? Math.round(Number(durationSeconds) * 1000) : 0;
  if (!total) return lines.map((t) => ({ text: t, start_time_ms: 0, end_time_ms: 0 }));

  const weights = lines.map((l) => Math.max(l.length, 8));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const usable = Math.max(1000, total - leadInMs);
  let at = leadInMs;

  return lines.map((t, i) => {
    const span = Math.max(700, Math.round((weights[i] / sum) * usable));
    const start = Math.round(at);
    at += span;
    return {
      text: t,
      start_time_ms: start,
      end_time_ms: Math.round(Math.min(at, total)),
    };
  });
}

export function wordsForLine(line) {
  const stored = Array.isArray(line?.words) ? line.words.filter((w) => w && w.text) : [];
  if (stored.length) {
    return stored.map((w) => ({
      text: String(w.text),
      start: Number(w.start_time_ms) || 0,
      end: Number(w.end_time_ms) || 0,
    }));
  }

  const tokens = String(line?.text || "").split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  const start = Number(line?.start_time_ms) || 0;
  const end = Number(line?.end_time_ms) || start;
  const span = Math.max(end - start, tokens.length * 240);
  const weights = tokens.map((t) => Math.max(t.replace(/[^\p{L}\p{N}]/gu, "").length, 2));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;

  let at = start;
  return tokens.map((t, i) => {
    const w = Math.max(80, Math.round((weights[i] / sum) * span));
    const s = Math.round(at);
    at += w;
    return { text: t, start: s, end: Math.round(at) };
  });
}

export function activeLineIndex(lines, ms) {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (ms >= (Number(lines[i]?.start_time_ms) || 0)) idx = i;
    else break;
  }
  return idx;
}

export function activeWordIndex(words, ms) {
  if (!words?.length) return -1;
  let idx = 0;
  for (let i = 0; i < words.length; i++) {
    if (ms >= words[i].start) idx = i;
    else break;
  }
  return idx;
}

// Metadata-only read of the real audio length, used when a track has no stored
// duration — timing estimates are meaningless without it.
export function readAudioDuration(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (!url) return resolve(0);
    const audio = document.createElement("audio");
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      audio.removeAttribute("src");
      resolve(Number.isFinite(value) && value > 0 ? value : 0);
    };
    const timer = setTimeout(() => finish(0), timeoutMs);
    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", () => finish(audio.duration));
    audio.addEventListener("error", () => finish(0));
    audio.src = url;
  });
}

// Every path that writes a track's lyrics goes through here, so the timecoded
// record the player reads is always the same text the user just saved — an edit
// can never leave stale timings behind.
export async function saveTimedLyrics({ trackId, uploaderId, text, durationSeconds, audioUrl }) {
  if (!trackId) return { duration: 0, saved: false };
  const clean = String(text || "").trim();

  const existing = await base44.entities.Lyrics
    .filter({ track_id: trackId }, "-created_date", 5)
    .catch(() => []);
  const rec = Array.isArray(existing) && existing.length ? existing[0] : null;

  if (!clean) {
    if (rec) await base44.entities.Lyrics.update(rec.id, { lines: [] });
    return { duration: 0, saved: false };
  }

  const stored = Number(durationSeconds) || 0;
  const duration = stored > 0 ? stored : await readAudioDuration(audioUrl);
  if (!duration) return { duration: 0, saved: false };

  const lines = buildTimedLines(clean, duration);
  if (rec) {
    await base44.entities.Lyrics.update(rec.id, { lines, status: "approved" });
  } else {
    await base44.entities.Lyrics.create({
      track_id: trackId,
      uploader_id: uploaderId,
      lines,
      status: "approved",
    });
  }
  return { duration, saved: true };
}