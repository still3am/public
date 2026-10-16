import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import { getDeviceId, getDeviceLabel } from "@/lib/deviceId";

const PUBLISH_EVERY_MS = 30000;
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

// Keeps this device's playback position on the server and surfaces what the
// user's OTHER devices were last playing, so they can pick up where they left off.
export function usePlaybackSync() {
  const { user } = useAuth();
  const { currentTrack, position, isPlaying } = usePlayer();
  const deviceId = getDeviceId();

  const scopeRef = useRef(null);
  if (!scopeRef.current || scopeRef.current.uid !== user?.id) scopeRef.current = { uid:user?.id, rowId:null, tail:Promise.resolve(), read:0 };
  const scope = scopeRef.current;
  const latestRef = useRef({ currentTrack, position, isPlaying });
  const [remote, setRemote] = useState(null);

  useEffect(() => {
    latestRef.current = { currentTrack, position, isPlaying };
  }, [currentTrack, position, isPlaying]);

  const publish = useCallback(async () => {
    if (!scope.uid || scopeRef.current !== scope) return;
    const { currentTrack: t, position: pos, isPlaying: playing } = latestRef.current;
    const payload = {
      user_id: user.id,
      device_id: deviceId,
      device_label: getDeviceLabel(),
      track_id: t?.id || "",
      track: t ? JSON.stringify({
        id: t.id,
        title: t.title,
        artist: t.artist,
        uploader_id: t.uploader_id,
        uploader_name: t.uploader_name,
        cover_art_url: t.cover_art_url,
        audio_url: t.audio_url,
        _private_audio:!!t._private_audio,
        duration_seconds: t.duration_seconds,
        genre: t.genre,
        explicit: t.explicit,
        is_published: true,
      }) : "",
      position_seconds: Math.round(pos || 0),
      is_playing: !!playing && !!t,
      sampled_at: new Date().toISOString(),
    };
    const task = scope.tail.then(async () => {
      if (scopeRef.current !== scope) return;
      if (!scope.rowId) {
        const page = await base44.entities.PlaybackState.filter({user_id:scope.uid,device_id:deviceId},"-created_date",1);
        if (scopeRef.current !== scope) return;
        const rows=Array.isArray(page)?page:page?.items;
        if (!Array.isArray(rows)) throw Error("Invalid playback state response");
        scope.rowId=rows[0]?.id || null;
      }
      if (scopeRef.current !== scope) return;
      if (scope.rowId) await base44.entities.PlaybackState.update(scope.rowId,payload);
      else {
        const created=await base44.entities.PlaybackState.create(payload);
        if (scopeRef.current === scope) scope.rowId=created?.id || null;
      }
    });
    // Serialize writes so rapid play/pause events cannot create duplicate rows
    // or let an older position finish after the newest one.
    scope.tail=task.catch(()=>{});
    await scope.tail;
  }, [scope, deviceId]);

  // Push on every meaningful change (including clearing the queue, so the
  // server doesn't keep a stale "playing" record that triggers auto-resume),
  // then on a slow heartbeat while playing.
  useEffect(() => {
    publish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, isPlaying, publish]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(publish, PUBLISH_EVERY_MS);
    return () => clearInterval(id);
  }, [isPlaying, publish]);

  // Read the newest state belonging to a DIFFERENT device.
  const loadRemote = useCallback(async () => {
    if (!scope.uid || scopeRef.current !== scope) return;
    const request=++scope.read;
    try {
      const page = await base44.entities.PlaybackState.filter(
        { user_id: user.id },
        "-updated_date",
        20
      );
      if(scopeRef.current!==scope || request!==scope.read)return;
      const rows=Array.isArray(page)?page:page?.items;
      if(!Array.isArray(rows))throw Error("Invalid playback state response");
      const other = rows
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
      if (!track) {
        setRemote(null);
        return;
      }
      // If the other device is still playing, its stored position is already
      // out of date — advance it by the time elapsed since it was sampled so
      // resuming here lands on the right spot instead of jumping backwards.
      const sampledAt = new Date(other.sampled_at || other.updated_date).getTime();
      let at = Math.max(0, other.position_seconds || 0);
      if (other.is_playing && !isNaN(sampledAt)) {
        at += Math.max(0, (Date.now() - sampledAt) / 1000);
        const dur = track.duration_seconds || 0;
        if (dur) at = Math.min(at, dur);
      }
      setRemote({ owner:scope, value:{ ...other, trackObj: track, resumeAt: Math.round(at) } });
    } catch {
      // Preserve confirmed same-account state on transient network failures.
    }
  }, [scope, deviceId]);

  useEffect(() => {
    loadRemote();
    // Every listening device writes this row on a heartbeat, so our own writes
    // would otherwise trigger a pointless re-read of the collection. Only a
    // change from ANOTHER device is worth refreshing.
    let unsub=()=>{};try{unsub = base44.entities.PlaybackState.subscribe((event) => {
      if (event?.data?.device_id === deviceId) return;
      loadRemote();
    });}catch{}
    return unsub;
  }, [loadRemote, deviceId]);

  // Mobile browsers often never fire pagehide/unload (the tab gets frozen or
  // backgrounded instead), so flush on visibility change too — and re-read
  // remote state when we come back into view, since realtime events don't
  // arrive while the page is frozen.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") publish();
      else loadRemote();
    };
    window.addEventListener("pagehide", publish);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", publish);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [publish, loadRemote]);

  return { remote:remote?.owner===scope?remote.value:null, refreshRemote: loadRemote };
}