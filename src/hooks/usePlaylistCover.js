import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Playlists are often built without artwork, so one that has none borrows the
// cover of a song inside it rather than showing a placeholder next to real
// songs. Resolved covers stay for the session: the same playlist appears in the
// library, in search results and in the pickers, and none of those should
// re-read the tracks for a cover that is already known.
const covers = new Map();
const inFlight = new Map();

async function resolveCover(trackIds) {
  const page = await base44.entities.Track.filter(
    {
      id: { $in: trackIds.slice(0, 100) },
      cover_art_url: { $exists: true, $ne: "" },
    },
    { limit: 1, fields: ["id", "cover_art_url"] }
  );
  const items = Array.isArray(page) ? page : page?.items || [];
  return items[0]?.cover_art_url || "";
}

/**
 * The cover to draw for a playlist: its own artwork when it has one, otherwise
 * the cover of the first song in it that has one ("" while that is unknown or
 * when no song in it has artwork).
 */
export function usePlaylistCover(playlist) {
  const id = playlist?.id;
  const own = playlist?.cover_art_url || "";
  const trackIds = playlist?.track_ids || [];
  const [borrowed, setBorrowed] = useState("");

  useEffect(() => {
    if (own || !id || !trackIds.length) return;
    if (covers.has(id)) {
      setBorrowed(covers.get(id));
      return;
    }
    let alive = true;
    const request = inFlight.get(id) || resolveCover(trackIds).catch(() => "");
    inFlight.set(id, request);
    request.then((cover) => {
      covers.set(id, cover);
      inFlight.delete(id);
      if (alive) setBorrowed(cover);
    });
    return () => {
      alive = false;
    };
  }, [id, own, trackIds.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return own || borrowed;
}