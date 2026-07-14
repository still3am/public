import { useState, useCallback } from "react";
import AddToPlaylistModal from "@/components/AddToPlaylistModal";

export function useAddToPlaylist() {
  const [trackId, setTrackId] = useState(null);
  const addToPlaylist = useCallback((tid) => setTrackId(tid), []);
  const modal = trackId ? (
    <AddToPlaylistModal trackId={trackId} onClose={() => setTrackId(null)} />
  ) : null;
  return { addToPlaylist, modal };
}