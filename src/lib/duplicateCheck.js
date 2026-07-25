// Duplicate detection for track uploads.
// Normalizes title + artist and compares against the uploader's existing library.

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[\(\[].*?[\)\]]/g, "") // strip parentheticals (feat, remix, edition...)
    .replace(/\b(official|audio|video|lyrics?|hd|hq|remaster(ed)?|feat\.?|ft\.?|with|explicit|clean|version|single|preview)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function normalizeKey(title = "", artist = "") {
  const t = normalize(title);
  if (!t) return "";
  const a = normalize(artist);
  return a ? `${t}::${a}` : t;
}

export function findDuplicateTracks(existingTracks = [], candidate) {
  const key = normalizeKey(candidate.title || candidate.file_name, candidate.artist);
  if (!key) return [];
  return (existingTracks || []).filter((t) => normalizeKey(t.title, t.artist) === key);
}