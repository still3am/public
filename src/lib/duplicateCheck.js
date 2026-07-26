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
  const cTitle = normalize(candidate.title || candidate.file_name || "");
  const cArtist = normalize(candidate.artist || "");
  const cKey = cTitle ? (cArtist ? `${cTitle}::${cArtist}` : cTitle) : "";
  const cDur = Math.round(candidate.duration || candidate.duration_seconds || 0);
  const cUrl = candidate.audio_url || "";
  const seen = new Set();
  const out = [];
  for (const t of existingTracks || []) {
    if (!t || seen.has(t.id)) continue;
    const tTitle = normalize(t.title || "");
    const tArtist = normalize(t.artist || "");
    const tKey = tTitle ? (tArtist ? `${tTitle}::${tArtist}` : tTitle) : "";
    const tDur = Math.round(t.duration_seconds || 0);
    let dup = false;
    if (cUrl && t.audio_url && cUrl === t.audio_url) dup = true;
    else if (cKey && tKey && cKey === tKey) dup = true;
    else if (cTitle && cTitle.length > 3 && tTitle === cTitle) dup = true;
    else if (
      cDur && tDur &&
      Math.abs(cDur - tDur) <= 1 &&
      cTitle && tTitle &&
      (cTitle === tTitle || tTitle.includes(cTitle) || cTitle.includes(tTitle))
    )
      dup = true;
    if (dup) {
      seen.add(t.id);
      out.push(t);
    }
  }
  return out;
}