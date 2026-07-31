import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import { getDeviceId, getDeviceLabel } from "@/lib/deviceId";

const PUBLISH_EVERY_MS = 10000;
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

// Keeps this device's playback position on the server and surfaces what the
// user's OTHER devices were last playing, so they can pick up where they left off.
export function usePlaybackSync() {
  const { user } = useAuth();
  const { currentTrack, position, isPlaying } = usePlayer();
  const deviceId = getDeviceId();

  const rowIdRef = useRef(null);
  const lastPushRef = useRef(0);
  const latestRef = useRef({ currentTrack, position, isPlaying });
  const [remote, setRemote] = useState(null);

  useEffect(() => {
    latestRef.current = { currentTrack, position, isPlaying };
  }, [currentTrack, position, isPlaying]);

  const publish = useCallback(async () => {
    if (!user?.id) return;
    const { currentTrack: t, position: pos, isPlaying: playing } = latestRef.current;
    if (!t) return;
    const payload = {
      user_id: user.id,
      device_id: deviceId,
      device_label: getDeviceLabel(),
      track_id: t.id,
      track: JSON.stringify({
        id: t.id,
        title: t.title,
        artist: t.artist,
        uploader_id: t.uploader_id,
        uploader_name: t.uploader_name,
        cover_art_url: t.cover_art_url,
        audio_url: t.audio_url,
        duration_seconds: t.duration_seconds,
        genre: t.genre,
        explicit: t.explicit,
        is_published: true,
      }),
      position_seconds: Math.round(pos || 0),
      is_playing: !!playing,
      sampled_at: new Date().toISOString(),
    };
    lastPushRef.current = Date.now();
    try {
      if (!rowIdRef.current) {
        const existing = await base44.entities.PlaybackState.filter(
          { user_id: user.id, device_id: deviceId },
          "-created_date",
          1
        );
        rowIdRef.current = existing?.[0]?.id || null;
      }
      if (rowIdRef.current) {
        await base44.entities.PlaybackState.update(rowIdRef.current, payload);
      } else {
        const created = await base44.entities.PlaybackState.create(payload);
        rowIdRef.current = created?.id || null;
      }
    } catch {
      /* sync is best-effort — never interrupt playback */
    }
  }, [user?.id, deviceId]);

  // Push on every meaningful change, then on a slow heartbeat while playing.
  useEffect(() => {
    if (currentTrack) publish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(publish, PUBLISH_EVERY_MS);
    return () => clearInterval(id);
  }, [isPlaying, publish]);

  useEffect(() => {
    const flush = () => publish();
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [publish]);

  // Read the newest state belonging to a DIFFERENT device.
  const loadRemote = useCallback(async () => {
    if (!user?.id) return;
    try {
      const rows = await base44.entities.PlaybackState.filter(
        { user_id: user.id },
        "-updated_date",
        20
      );
      const other = (rows || [])
        .filter((r) => r.device_id !== deviceId && r.track_id && r.track)
        .filter((r) => {
          const at = new Date(r.sampled_at || r.updated_date).getTime();
          return !isNaN(at) && Date.now() - at < STALE_AFTER_MS;
        })[0];
      if (!other) {
        setRemote(null);
        return;
      }
      let track = null;
      try {
        track = JSON.parse(other.track);
      } catch {}
      setRemote(track ? { ...other, trackObj: track } : null);
    } catch {
      setRemote(null);
    }
  }, [user?.id, deviceId]);

  useEffect(() => {
    loadRemote();
    const unsub = base44.entities.PlaybackState.subscribe(() => loadRemote());
    return unsub;
  }, [loadRemote]);

  return { remote, refreshRemote: loadRemote };
}