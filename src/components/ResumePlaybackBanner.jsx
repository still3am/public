import { useEffect } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaybackSync } from "@/hooks/usePlaybackSync";

// Automatically hands off playback from another of the user's devices: when a
// remote device was last playing something different from what's playing here,
// load it straight into the player at the matching position — no accept prompt.
export default function ResumePlaybackBanner() {
  const { currentTrack, resumeTrack } = usePlayer();
  const { remote } = usePlaybackSync();

  useEffect(() => {
    if (!remote?.trackObj) return;
    if (currentTrack && currentTrack.id === remote.track_id) return;
    const t = remote.trackObj;
    const at = remote.resumeAt ?? Math.max(0, remote.position_seconds || 0);
    resumeTrack(t, at);
  }, [
    remote?.track_id,
    remote?.trackObj,
    remote?.resumeAt,
    currentTrack?.id,
    resumeTrack,
  ]);

  return null;
}