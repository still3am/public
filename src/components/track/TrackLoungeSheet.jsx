import { useEffect, useRef } from "react";
import LoungeHostModal from "@/components/LoungeHostModal";
import { useLoungeHost } from "@/hooks/useLoungeHost";
import { usePlayer } from "@/context/PlayerContext";

/**
 * "Lounge" from a track's menu: hosts (or reuses) the user's lounge, puts this
 * track up next for everyone, and shows the invite code to share.
 */
export default function TrackLoungeSheet({ track, onClose }) {
  const lounge = useLoungeHost();
  const player = usePlayer();
  const queued = useRef(false);

  useEffect(() => {
    if (queued.current || !track) return;
    queued.current = true;
    player.addToQueue(track);
  }, [player, track]);

  return <LoungeHostModal lounge={lounge} onClose={onClose} />;
}