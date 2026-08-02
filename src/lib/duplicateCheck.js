// Duplicate detection for track uploads.
// Compares a candidate upload against every track already on the app using
// fuzzy title/artist similarity + duration, so re-uploads still get caught when
// the tags are messy ("Artist - Title (Official Audio)", swapped fields, typos).

const NOISE_WORDS =
  /\b(official|officialvideo|audio|video|lyric|lyrics|hd|hq|4k|remaster|remastered|feat|ft|featuring|with|explicit|clean|version|single|preview|prod|mv|visualizer|visualiser|extended|radio|edit|bonus|track|full|song|free|download|mp3)\b/g;

// Lowercases, strips accents/parentheticals/noise words, leaves single spaces.
function basic(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\(\[\{].*?[\)\]\}]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(NOISE_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Alphanumeric-only form — punctuation and spacing differences disappear.
function compact(s) {
  return basic(s).replace(/ /g, "");
}

function tokens(s) {
  return basic(s).split(" ").filter(Boolean);
}

// Dice coefficient over character bigrams: 1 = identical, 0 = nothing shared.
function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const grams = new Map();
  for (let i = 0; i < a.length - 1; i++) {
    const g = a.slice(i, i + 2);
    grams.set(g, (grams.get(g) || 0) + 1);
  }
  let hits = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const g = b.slice(i, i + 2);
    const n = grams.get(g) || 0;
    if (n > 0) {
      grams.set(g, n - 1);
      hits++;
    }
  }
  return (2 * hits) / (a.length + b.length - 2);
}

function containsEither(a, b) {
  if (!a || !b) return false;
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  return short.length >= 4 && long.includes(short);
}

// One token set fully covers the other (e.g. "levitating" vs "levitating dualipa").
function tokenSubset(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return false;
  const small = ta.length <= tb.length ? ta : tb;
  const big = new Set(ta.length <= tb.length ? tb : ta);
  return small.every((t) => big.has(t));
}

// Filenames and tags often merge both fields: "Artist - Title", "Title by Artist".
// Produce every plausible (title, artist) reading so either arrangement matches.
function readings(title, artist) {
  const out = [{ t: title || "", a: artist || "" }];
  const raw = (title || "").replace(/\.[a-z0-9]{2,4}$/i, "");
  const dash = raw.split(/\s[-–—_]\s|\s{2,}[-–—]\s{0,}/);
  if (dash.length === 2) {
    out.push({ t: dash[1], a: dash[0] });
    out.push({ t: dash[0], a: dash[1] });
  }
  const by = raw.split(/\sby\s/i);
  if (by.length === 2) out.push({ t: by[0], a: by[1] });
  return out;
}

export function normalizeKey(title = "", artist = "") {
  const t = compact(title);
  if (!t) return "";
  const a = compact(artist);
  return a ? `${t}::${a}` : t;
}

function artistsMatch(a, b) {
  const ca = compact(a);
  const cb = compact(b);
  if (!ca || !cb) return false;
  return ca === cb || containsEither(ca, cb) || similarity(ca, cb) >= 0.8;
}

// Scores one candidate reading against one existing track.
// Returns a confidence 0..1; anything >= 0.5 is treated as a duplicate.
function scorePair(cand, existing, cDur, tDur) {
  const ct = compact(cand.t);
  const et = compact(existing.t);
  if (!ct || !et) return 0;

  const titleSim = Math.max(
    similarity(ct, et),
    tokenSubset(cand.t, existing.t) ? 0.9 : 0,
    containsEither(ct, et) ? 0.85 : 0
  );
  const sameArtist = artistsMatch(cand.a, existing.a);
  const durKnown = cDur > 0 && tDur > 0;
  const durDelta = durKnown ? Math.abs(cDur - tDur) : Infinity;

  // Exact same title text — strongest signal there is.
  if (ct === et && ct.length > 3) return 1;
  // Same artist and a clearly similar title.
  if (sameArtist && titleSim >= 0.72) return 0.95;
  // Near-identical runtime plus a recognizable title.
  if (durDelta <= 2 && titleSim >= 0.6) return 0.9;
  // Same artist and same runtime — retitled re-upload of the same audio.
  if (sameArtist && durDelta <= 2) return 0.85;
  // Very similar title on its own — flags the same song name anywhere on
  // PUBLIC, regardless of artist or uploader (covers, re-uploads, retags).
  if (titleSim >= 0.8 && ct.length > 3) return 0.7;
  // Same runtime and the artist name appears inside the other's title.
  if (durDelta <= 1 && (containsEither(ct, compact(existing.a)) || containsEither(et, compact(cand.a))))
    return 0.6;
  return 0;
}

// candidate: { title, artist, duration | duration_seconds, file_name, audio_url }
// Returns matching existing tracks, most confident first.
export function findDuplicateTracks(existingTracks = [], candidate = {}) {
  const cDur = Math.round(candidate.duration || candidate.duration_seconds || 0);
  const cUrl = candidate.audio_url || "";

  // Every way of reading the incoming metadata, including the raw filename.
  const cands = [
    ...readings(candidate.title, candidate.artist),
    ...(candidate.file_name ? readings(candidate.file_name, candidate.artist) : []),
  ].filter((r) => compact(r.t));

  const scored = [];
  for (const t of existingTracks || []) {
    if (!t) continue;
    if (cUrl && t.audio_url && cUrl === t.audio_url) {
      scored.push({ track: t, score: 1 });
      continue;
    }
    const tDur = Math.round(t.duration_seconds || 0);
    const exs = readings(t.title, t.artist);
    let best = 0;
    for (const c of cands) {
      for (const e of exs) {
        best = Math.max(best, scorePair(c, e, cDur, tDur));
        if (best === 1) break;
      }
      if (best === 1) break;
    }
    if (best >= 0.5) scored.push({ track: t, score: best });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .map((s) => ({ ...s.track, _match_score: s.score }));
}