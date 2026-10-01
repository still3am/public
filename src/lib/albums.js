import { base44 } from "@/api/base44Client";

// Albums / EPs. The Album record holds the release (title, cover, artist);
// each track carries album_id + track_number so the running order survives
// edits and re-uploads.

export async function findOrCreateAlbum({ title, artist, genre, coverUrl, userId }) {
  const clean = (title || "").trim();
  if (!clean || !userId) return null;
  const existing = await base44.entities.Album
    .filter({ title: clean, creator_id: userId }, "-created_date", 1)
    .catch(() => []);
  if (existing && existing.length) {
    const album = existing[0];
    // A track's artwork fills in a release that never got its own cover.
    if (!album.cover_art_url && coverUrl) {
      const updated = await base44.entities.Album
        .update(album.id, { cover_art_url: coverUrl })
        .catch(() => null);
      return updated || album;
    }
    return album;
  }
  return await base44.entities.Album.create({
    title: clean,
    creator_id: userId,
    artisan: artist || "",
    genre: genre || "Other",
    cover_art_url: coverUrl || "",
  });
}

export async function loadAlbumsForTracks(tracks) {
  const ids = [...new Set((tracks || []).map((t) => t?.album_id).filter(Boolean))];
  if (!ids.length) return [];
  return await base44.entities.Album
    .filter({ id: { $in: ids } }, "-created_date", 200)
    .catch(() => []);
}

const byTrackNumber = (a, b) =>
  (a.track_number || 0) - (b.track_number || 0) ||
  String(a.created_date || "").localeCompare(String(b.created_date || ""));

/**
 * Split an artist's tracks into album releases (running order intact) and the
 * loose singles that never belonged to one.
 */
export function groupTracksByRelease(tracks, albums) {
  const byId = new Map((albums || []).map((a) => [a.id, a]));
  const groups = new Map();
  const singles = [];
  for (const track of tracks || []) {
    const album = track?.album_id ? byId.get(track.album_id) : null;
    if (album) {
      const group = groups.get(album.id) || { album, tracks: [] };
      group.tracks.push(track);
      groups.set(album.id, group);
    } else {
      singles.push(track);
    }
  }
  const releases = [...groups.values()].map((g) => ({
    album: g.album,
    tracks: g.tracks.slice().sort(byTrackNumber),
  }));
  releases.sort((a, b) =>
    String(b.album.created_date || "").localeCompare(String(a.album.created_date || ""))
  );
  return { releases, singles };
}

/** Release year — the earliest year any of its tracks landed. */
export function albumYear(album, tracks) {
  const dates = [album?.created_date, ...(tracks || []).map((t) => t.created_date)].filter(Boolean);
  if (!dates.length) return "";
  const years = dates.map((d) => new Date(d).getFullYear()).filter((y) => isFinite(y));
  return years.length ? String(Math.min(...years)) : "";
}