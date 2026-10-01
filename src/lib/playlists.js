import { base44 } from "@/api/base44Client";

// Every playlist the user can actually edit: their own, plus the ones they
// were invited to collaborate on. Surfaces that list "my playlists" use this so
// a shared playlist shows up for both people.
export async function loadMyPlaylists(userId, limit = 200) {
  if (!userId) return [];
  const [own, shared] = await Promise.all([
    base44.entities.Playlist
      .filter({ creator_id: userId }, "-created_date", limit)
      .catch(() => []),
    base44.entities.Playlist
      .filter({ collaborator_ids: userId }, "-created_date", limit)
      .catch(() => []),
  ]);
  const map = new Map();
  for (const pl of [...(own || []), ...(shared || [])]) {
    if (pl?.id) map.set(pl.id, pl);
  }
  return [...map.values()].sort((a, b) =>
    String(b.created_date || "").localeCompare(String(a.created_date || ""))
  );
}

export function isPlaylistEditor(playlist, userId) {
  if (!playlist || !userId) return false;
  if (playlist.creator_id === userId) return true;
  return (playlist.collaborator_ids || []).includes(userId);
}