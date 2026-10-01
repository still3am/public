/**
 * One source of truth for the artist ↔ track relationship.
 *
 * A track carries its credits in a single free-text `artist` field, which may
 * name one or several people in any of the usual notations ("A feat. B",
 * "A & B", "A, B", "A x B") — and may be empty, in which case the uploader is
 * the credit. Historically every screen re-implemented this splitting slightly
 * differently, so artist pages, "More From This Artist", search and the
 * auto-queue each disagreed about which tracks belong to an artist.
 *
 * Everything that needs that answer goes through this module instead.
 */

// One regex, used for both display (separators preserved) and matching.
const CREDIT_SPLIT = new RegExp(
  "(\\s*[,&;+×]\\s*|\\s+(?:feat|ft|featuring|with|prod|presents|vs)\\.?\\s+|\\s+x\\s+)",
  "gi"
);

// "(feat. X)" inside a credit names another credited artist; any other
// parenthetical is an annotation ("(Official Audio)") and is dropped.
function expandParentheticals(credit) {
  return String(credit || "").replace(/[([][^)\]]*[)\]]/g, (match, offset, full) => {
    const inner = String(full).slice(offset + 1, offset + match.length - 1);
    return /\b(feat|ft|featuring|with)\b/i.test(inner) ? ` ${inner} ` : " ";
  });
}

function cleanName(value) {
  return String(value || "")
    .replace(/^[\s\-–—·.|]+/, "")
    .replace(/[\s\-–—·.|]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits a credit string into its individual names.
 * Returns `pairs` (each name plus the separator that followed it, so renderers
 * can rebuild the original text) and `names` (just the names).
 */
export function splitCredits(credit) {
  const pairs = [];
  const tokens = expandParentheticals(credit).split(CREDIT_SPLIT);
  tokens.forEach((token, i) => {
    if (i % 2 === 1) {
      if (pairs.length) pairs[pairs.length - 1].after = token;
      return;
    }
    const name = cleanName(token);
    if (name) pairs.push({ name, after: "" });
  });
  return { pairs, names: pairs.map((p) => p.name) };
}

export function artistNames(credit) {
  return splitCredits(credit).names;
}

/**
 * Comparison key for a name: case, accents, punctuation and spacing all stop
 * mattering, so "Beéle", "Beele", "BEÉLE" and "Beéle." are one artist. Letters
 * and digits of any script are kept, so non-Latin names still match.
 */
export function artistKey(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Every key an artist record answers to — its name plus any aliases. */
export function artistKeysFor(artist) {
  const keys = new Set();
  const push = (value) => {
    const key = artistKey(value);
    if (key) keys.add(key);
  };
  push(artist?.name);
  (artist?.aliases || []).forEach(push);
  return keys;
}

/** True when an artist's name (or one of its aliases) contains the query. */
export function artistMatches(artist, query) {
  const q = artistKey(query);
  if (!q) return false;
  for (const key of artistKeysFor(artist)) {
    if (key.includes(q)) return true;
  }
  return false;
}

/**
 * Every key a track is credited under: the whole credit string (so
 * "Tyler, The Creator" survives the comma split), each individual name, and —
 * only when the artist field is blank — the uploader's name.
 */
export function trackCreditKeys(track) {
  const keys = new Set();
  const push = (value) => {
    const key = artistKey(value);
    if (key) keys.add(key);
  };
  const raw = track?.artist ? String(track.artist) : "";
  if (raw) push(raw);
  const names = artistNames(raw);
  const credited = names.length ? names : artistNames(track?.uploader_name);
  credited.forEach(push);
  return keys;
}

export function trackMatchesArtist(track, artist) {
  const wanted = artistKeysFor(artist);
  if (!wanted.size) return false;
  for (const key of trackCreditKeys(track)) {
    if (wanted.has(key)) return true;
  }
  return false;
}

/** True when a track is credited to someone whose name matches the query. */
export function trackMatchesQuery(track, query) {
  const q = artistKey(query);
  if (!q) return false;
  for (const key of trackCreditKeys(track)) {
    if (key.includes(q)) return true;
  }
  return false;
}

/**
 * The artist's catalogue: published tracks where they appear as a primary
 * artist, a featured artist, or one of several credited artists.
 */
export function tracksForArtist(tracks, artist, { publishedOnly = true } = {}) {
  const wanted = artistKeysFor(artist);
  if (!wanted.size) return [];
  return (tracks || []).filter((track) => {
    if (!track || (publishedOnly && track.is_published !== true)) return false;
    for (const key of trackCreditKeys(track)) {
      if (wanted.has(key)) return true;
    }
    return false;
  });
}

/** True when two tracks share at least one credited artist. */
export function trackSharesArtist(a, b) {
  const keys = trackCreditKeys(a);
  if (!keys.size) return false;
  for (const key of trackCreditKeys(b)) {
    if (keys.has(key)) return true;
  }
  return false;
}

/**
 * "More From This Artist" — the same relationship rule as the artist pages,
 * drawn from the full published catalogue and ordered by plays.
 */
export function moreFromArtist(tracks, track, limit = 6) {
  if (!track?.id) return [];
  const keys = trackCreditKeys(track);
  if (!keys.size) return [];
  return (tracks || [])
    .filter((other) => {
      if (!other?.id || other.id === track.id) return false;
      if (other.is_published !== true) return false;
      for (const key of trackCreditKeys(other)) {
        if (keys.has(key)) return true;
      }
      return false;
    })
    .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
    .slice(0, limit);
}

/**
 * The A–Z artist index: every credited name plus every artist record, with the
 * number of published tracks behind each. Credits matching an alias fold into
 * that artist's record, and a collaboration counts once per artist.
 */
export function buildArtistIndex(tracks, artists) {
  // Alias and name keys both point back to the artist record.
  const recordByKey = new Map();
  (artists || []).forEach((artist) => {
    artistKeysFor(artist).forEach((key) => {
      if (!recordByKey.has(key)) recordByKey.set(key, artist);
    });
  });

  const entries = new Map();
  (tracks || []).forEach((track) => {
    if (!track || track.is_published !== true) return;
    // A credit that matches a whole artist record ("Tyler, The Creator") is
    // that artist — it must not also scatter across comma-split fragments.
    const whole = recordByKey.get(artistKey(track.artist));
    const names = artistNames(track.artist);
    const credited = whole ?
    [whole.name] :
    names.length ?
    names :
    artistNames(track.uploader_name);
    const counted = new Set();
    credited.forEach((name) => {
      const record = recordByKey.get(artistKey(name));
      const key = record ? artistKey(record.name) : artistKey(name);
      if (!key || counted.has(key)) return;
      counted.add(key);
      const entry = entries.get(key);
      if (entry) {
        entry.count += 1;
      } else {
        entries.set(key, {
          display: record ? record.name : cleanName(name),
          record: record || null,
          count: 1,
        });
      }
    });
  });

  // Artist records with no published tracks still appear.
  (artists || []).forEach((artist) => {
    const key = artistKey(artist?.name);
    if (!key) return;
    const entry = entries.get(key);
    if (entry) {
      entry.display = artist.name;
      entry.record = artist;
    } else {
      entries.set(key, { display: artist.name, record: artist, count: 0 });
    }
  });

  return [...entries.values()].sort((a, b) =>
    artistKey(a.display).localeCompare(artistKey(b.display))
  );
}