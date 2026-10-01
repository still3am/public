import { base44 } from "@/api/base44Client";
import { getArtists } from "@/lib/catalogCache";

/**
 * The one artist ↔ track relationship in PUBLIC.
 *
 * Every surface that asks "which tracks belong to this artist?" — Public
 * Records, the artist page discography, "More from <artist>" on a track page,
 * the A–Z directory and search result counts — resolves it here, so the same
 * artist can never show two different catalogues.
 *
 * A track belongs to an artist when their normalized names intersect. Names are
 * resolved from every credit a track can carry:
 *   - the artist field, split on collaboration separators (",", "&", "x",
 *     "feat.", "ft.", "featuring", "with", "presents", "/", ";"),
 *   - the featured credit hidden in the title ("Song (feat. Beéle)"),
 *   - and, for an uncredited upload, the uploader's display name.
 *
 * Comparison is diacritic- and case-insensitive, so "Beéle", "Beele" and
 * "BEÉLE" are one artist. The Artist entity has no alias field; a record's
 * canonical name is what aliases resolve to.
 */

const COMBINING_MARKS = /[\u0300-\u036f]/g;

// Collaboration separators. Word-boundary alternatives ("with", "x") only split
// on a standalone word, so "Within Temptation" and "Charli XCX" stay intact.
const SPLIT_RE =
  /\s*(?:,|;|\/|&|＆|×|\+|·|\b(?:feat|ft|featuring|with|presents|vs)\b\.?|\bx\b)\s*/gi;

// Featured credits are often only in the title: "Song (feat. X)" or "Song feat. X".
const TITLE_FEATURE_RES = [
  /[([]\s*(?:feat|ft|featuring|with)\.?\s*([^)\]]+)[)\]]/gi,
  /\b(?:feat|ft|featuring)\.?\s+([^)\]]+)$/gi,
];

export function normalizeArtistName(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[’'`´]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Display-cased individual names inside a credit string.
export function splitArtistNames(value) {
  return String(value ?? "")
    .split(SPLIT_RE)
    .map((s) => s.replace(/^[([{]+|[)\]}]+$/g, "").trim())
    .filter((s) => /[a-z0-9]/i.test(s));
}

export function featuredNamesFromTitle(title) {
  const out = [];
  for (const re of TITLE_FEATURE_RES) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(String(title ?? ""))) !== null) {
      out.push(...splitArtistNames(match[1]));
    }
  }
  return out;
}

// Every credit a track carries: { name (as written), key (normalized) }.
export function trackArtistCredits(track) {
  const credits = [];
  const seen = new Set();
  const add = (name) => {
    const key = normalizeArtistName(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    credits.push({ name: String(name).trim(), key });
  };

  splitArtistNames(track?.artist).forEach(add);
  featuredNamesFromTitle(track?.title).forEach(add);
  // A track with no credit at all belongs to whoever uploaded it.
  if (!credits.length) splitArtistNames(track?.uploader_name).forEach(add);

  return credits;
}

// Every normalized artist key a track can be credited under.
export function trackArtistKeys(track) {
  return trackArtistCredits(track).map((c) => c.key);
}

// Normalized keys an Artist record answers to (accepts a record or a plain name).
export function artistKeys(artist) {
  const name = typeof artist === "string" ? artist : artist?.name;
  return [...new Set(splitArtistNames(name).map(normalizeArtistName))].filter(Boolean);
}

// The caller may hand us an Artist record, a plain name, or a track — a track
// page asks "who else is on this?" by passing the track itself.
function keysOfTarget(target) {
  if (target && typeof target === "object") {
    return target.name ? artistKeys(target) : trackArtistKeys(target);
  }
  return artistKeys(target);
}

export function trackMatchesArtist(track, artist) {
  const target = keysOfTarget(artist);
  if (!target.length) return false;
  const keys = trackArtistKeys(track);
  return keys.some((k) => target.includes(k));
}

export function tracksForArtist(tracks, artist) {
  return (tracks || []).filter((t) => trackMatchesArtist(t, artist));
}

export function countTracksForArtist(tracks, artist) {
  return tracksForArtist(tracks, artist).length;
}

// ---------------------------------------------------------------------------
// Artist record lookup. The index is rebuilt whenever the artists cache hands
// back a fresh list, and new records are registered as they are created.
// ---------------------------------------------------------------------------

let indexedList = null;
let index = new Map();
let registered = [];

async function artistIndex() {
  const list = await getArtists();
  if (list !== indexedList) {
    indexedList = list;
    index = new Map();
    (Array.isArray(list) ? list : []).forEach((a) => {
      artistKeys(a).forEach((k) => {
        if (!index.has(k)) index.set(k, a);
      });
    });
  }
  if (registered.length) {
    registered.forEach((a) => artistKeys(a).forEach((k) => {
      if (!index.has(k)) index.set(k, a);
    }));
    registered = [];
  }
  return index;
}

// Existing record for a credit, or null. Never creates anything.
export async function findArtistRecord(name) {
  const key = normalizeArtistName(name);
  if (!key) return null;
  const map = await artistIndex();
  return map.get(key) || null;
}

// The record for a credit, created on first sight so every credited artist has
// a page of their own.
export async function ensureArtistRecord(name) {
  const clean = String(name ?? "").trim();
  if (!clean) return null;
  const existing = await findArtistRecord(clean);
  if (existing) return existing;
  const created = await base44.entities.Artist.create({ name: clean });
  if (created) registered.push(created);
  return created;
}