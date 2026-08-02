import { useEffect, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaybackSync } from "@/hooks/usePlaybackSync";

// Automatically hands off playback from another of the user's devices: when a
// remote device was last playing something and THIS device is idle, load that
// track straight into the player at the matching position — no accept prompt.
// It never hijacks a device that's already playing, and each remote track is
// handed off at most once so advancing position updates don't keep reloading it.
export default function ResumePlaybackBanner() {
  const { currentTrack, resumeTrack } = usePlayer();
  const { remote } = usePlaybackSync();
  const resumedRef = useRef(null);

  useEffect(() => {
    if (!remote?.trackObj) return;
    // Only hand off when this device is idle — never interrupt active listening.
    if (currentTrack) return;
    // Resume each remote track once; later position pings for the same track
    // are ignored so playback here isn't reloaded every few seconds.
    if (resumedRef.current === remote.track_id) return;
    resumedRef.current = remote.track_id;
    const t = remote.trackObj;
    const at = remote.resumeAt ?? Math.max(0, remote.position_seconds || 0);
    resumeTrack(t, at, false);
  }, [remote?.track_id, remote?.trackObj, currentTrack, resumeTrack]);

  return null;
}