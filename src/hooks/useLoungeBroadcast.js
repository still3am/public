import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { minimalTrack } from "@/lib/lounge";

// Host-side: periodically writes the host's current player state into the
// LoungeSession record so guests can mirror it. Approximate sync — drift of
// ~1–2s is expected, which is fine for "louder in person" use cases.
export function useLoungeBroadcast({ session, enabled, currentTrack, position, isPlaying }) {
  // Keep the freshest values in refs so the interval closure reads them without
  // restarting the timer on every position tick.
  const trackRef = useRef(currentTrack);
  useEffect(() => {
    trackRef.current = currentTrack;
  }, [currentTrack]);
  const posRef = useRef(position || 0);
  useEffect(() => {
    posRef.current = position || 0;
  }, [position]);
  const playingRef = useRef(!!isPlaying);
  useEffect(() => {
    playingRef.current = !!isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!session?.id || !enabled) return;
    let lastWrittenTrack = "";
    let lastWrittenPlaying = null;
    let lastWriteAt = 0;

    const tick = async () => {
      const now = Date.now();
      const track = trackRef.current;
      const trackId = track?.id || "";
      const playing = playingRef.current;
      // Write when: track changed, play state changed, or every ~3s for position.
      const trackChanged = trackId !== lastWrittenTrack;
      const playChanged = playing !== lastWrittenPlaying;
      const stale = now - lastWriteAt > 3000;
      if (!trackChanged && !playChanged && !stale) return;
      lastWriteAt = now;
      lastWrittenTrack = trackId;
      lastWrittenPlaying = playing;
      try {
        await base44.entities.LoungeSession.update(session.id, {
          current_track_id: trackId,
          current_track: track ? JSON.stringify(minimalTrack(track)) : "",
          position_seconds: Math.round(posRef.current || 0),
          is_playing: playing,
          sync_anchor_at: new Date().toISOString(),
        });
      } catch {}
    };

    tick();
    const interval = setInterval(tick, 3000);
    return () => clearInterval(interval);
  }, [session?.id, enabled]);
}