import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useLoungeHost } from "@/hooks/useLoungeHost";
import { usePlayer } from "@/context/PlayerContext";
import LoungeHostModal from "@/components/LoungeHostModal";

/**
 * Mounted only after "Lounge" is chosen, so menus on a page full of tracks
 * don't each carry a lounge host. Makes sure the track is in the host's
 * player, then opens the host's lounge.
 */
/** @param {any} props */
export default function TrackLoungeAction({ track, onClose }) {
  const lounge = useLoungeHost();
  const p = usePlayer();

  useEffect(() => {
    if (!p.currentTrack) p.playTrackAt([track]);
    else if (p.currentTrack.id !== track.id && !p.queue.some((q) => q.id === track.id)) p.addToQueue(track);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(<LoungeHostModal lounge={lounge} onClose={onClose} />, document.body);
}