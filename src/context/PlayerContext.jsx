import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { base44 } from "@/api/base44Client";
import { getRecord } from "@/lib/offlineCache";
import { buildAutoQueue } from "@/lib/autoQueue";
import {
  getTransitionSettings,
  isTransitionActive,
  TRANSITION_MODES,
} from "@/lib/transitions";

const PlayerContext = createContext(null);
export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }) {
  // Two audio elements enable a REAL overlapping crossfade: while one track
  // fades out on the inactive element, the next track fades in on the other.
  const audioRefs = [useRef(null), useRef(null)];
  if (typeof Audio !== "undefined") {
    audioRefs.forEach((r) => {
      if (!r.current) {
        const a = new Audio();
        try {
          a.crossOrigin = "anonymous";
        } catch {}
        a.preload = "auto";
        r.current = a;
      }
    });
  }
  const els = () => [audioRefs[0].current, audioRefs[1].current];

  // Shared Web Audio graph: each element -> its own gain -> analyser -> master -> out
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const masterGainRef = useRef(null);
  const gainRefs = [useRef(null), useRef(null)];
  const sourceRefs = [useRef(null), useRef(null)];

  const activeIdxRef = useRef(0);
  const blobUrlRefs = [useRef(null), useRef(null)];
  const sideLoadedIdRef = [useRef(null), useRef(null)];
  const sideReadyRef = [useRef(false), useRef(false)];

  const crossfadingRef = useRef(false);
  const crossfadeTimerRef = useRef(null);
  const preloadedTargetRef = useRef(null);
  const loadTokenRef = useRef(0);
  const handleTimeRef = useRef(() => {});
  const handleEndedRef = useRef(() => {});

  const activeEl = () => els()[activeIdxRef.current];
  const inactiveIdx = () => (activeIdxRef.current === 0 ? 1 : 0);
  const inactiveEl = () => els()[inactiveIdx()];

  const countedRef = useRef(new Set());
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);
  const [repeat, setRepeat] = useState("off"); // off | all | one
  const [shuffle, setShuffle] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const sleepTimerRef = useRef(null);
  const [sleepTimerEndsAt, setSleepTimerEndsAt] = useState(null);

  const queueRef = useRef([]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  const currentIndexRef = useRef(currentIndex);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  const repeatRef = useRef(repeat);
  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);
  const autoQueueLoadingRef = useRef(false);

  const currentTrack =
    currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  // --- Web Audio graph (created once, on first play) ---
  const ensureGraph = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      const master = ctx.createGain();
      master.gain.value = 1;
      els().forEach((a, i) => {
        if (!a) return;
        const src = ctx.createMediaElementSource(a);
        const g = ctx.createGain();
        g.gain.value = i === activeIdxRef.current ? 1 : 0;
        src.connect(g);
        g.connect(analyser);
        sourceRefs[i].current = src;
        gainRefs[i].current = g;
      });
      analyser.connect(master);
      master.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      masterGainRef.current = master;
      return ctx;
    } catch {
      return null;
    }
  }, []);

  const getAnalyser = useCallback(() => analyserRef.current, []);

  const enableAnalyser = useCallback(() => {
    const ctx = ensureGraph();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    return !!analyserRef.current;
  }, [ensureGraph]);

  // --- gain helpers ---
  const setGainImmediate = useCallback((side, v) => {
    const ctx = audioCtxRef.current;
    const g = gainRefs[side].current;
    if (!ctx || !g) return;
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(v, t);
  }, []);

  const rampGain = useCallback((side, to, dur) => {
    const ctx = audioCtxRef.current;
    const g = gainRefs[side].current;
    if (!ctx || !g) return;
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
    if (dur <= 0) g.gain.setValueAtTime(Math.max(0.0001, to), t);
    else g.gain.linearRampToValueAtTime(Math.max(0.0001, to), t + dur);
  }, []);

  // --- offline-blob-aware url resolution for a given side ---
  const resolveUrl = useCallback(async (track, side) => {
    sideLoadedIdRef[side].current = track.id;
    let url = track.audio_url;
    let blobUrl = null;
    try {
      const rec = await getRecord(track.id);
      if (rec && rec._blob) blobUrl = URL.createObjectURL(rec._blob);
    } catch {}
    if (blobUrlRefs[side].current && blobUrlRefs[side].current !== blobUrl) {
      URL.revokeObjectURL(blobUrlRefs[side].current);
    }
    blobUrlRefs[side].current = blobUrl || null;
    return blobUrl || url;
  }, []);

  const mirrorPlayback = useCallback(
    (el) => {
      if (!el) return;
      el.volume = volume;
      el.muted = muted;
      el.playbackRate = playbackRate;
    },
    [volume, muted, playbackRate]
  );

  // Abort any crossfade in progress: silence the tail element, restore active.
  const cancelCrossfade = useCallback(() => {
    crossfadingRef.current = false;
    preloadedTargetRef.current = null;
    if (crossfadeTimerRef.current) {
      clearTimeout(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
    }
    const is = inactiveIdx();
    const ie = els()[is];
    if (ie) {
      try {
        ie.pause();
      } catch {}
    }
    sideReadyRef[is].current = false;
    setGainImmediate(is, 0);
    setGainImmediate(activeIdxRef.current, 1);
  }, [setGainImmediate]);

  // Manual load on the active element (used for playTrackAt / next / prev).
  const loadOnActive = useCallback(
    async (track) => {
      const side = activeIdxRef.current;
      const el = els()[side];
      if (!el) return;
      cancelCrossfade();
      const token = ++loadTokenRef.current;
      const url = await resolveUrl(track, side);
      if (token !== loadTokenRef.current) return; // a newer load superseded us
      mirrorPlayback(el);
      el.src = url;
      el.load();
      setPosition(0);
      setDuration(0);
      ensureGraph();
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
      setGainImmediate(side, 1);
      el
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    },
    [resolveUrl, mirrorPlayback, ensureGraph, setGainImmediate, cancelCrossfade]
  );

  // Preload the next track onto the inactive element (no playback yet).
  const preloadSide = useCallback(
    async (targetIndex) => {
      const side = inactiveIdx();
      const el = els()[side];
      const track = queueRef.current[targetIndex];
      if (!el || !track) return;
      sideReadyRef[side].current = false;
      sideLoadedIdRef[side].current = track.id;
      const url = await resolveUrl(track, side);
      // If the active side changed hands while we were resolving, bail.
      if (side !== inactiveIdx()) return;
      mirrorPlayback(el);
      el.src = url;
      el.load();
      const markReady = () => {
        if (el.readyState >= 2) sideReadyRef[side].current = true;
      };
      el.addEventListener("canplay", markReady, { once: true });
      if (el.readyState >= 2) sideReadyRef[side].current = true;
    },
    [resolveUrl, mirrorPlayback]
  );

  // Real crossfade: start the next track on the inactive element and ramp the
  // two gains across one another, then promote the inactive element to active.
  const beginCrossfade = useCallback(
    (targetIndex, cf, remaining) => {
      const side = inactiveIdx();
      const el = els()[side];
      const track = queueRef.current[targetIndex];
      if (!el || !track) return;
      // Make sure the RIGHT track is loaded on the inactive element. If not,
      // kick off the load and retry on the next tick.
      if (sideLoadedIdRef[side].current !== track.id) {
        preloadedTargetRef.current = targetIndex;
        preloadSide(targetIndex);
        return;
      }
      // Only overlap once the next track has at least current data buffered.
      // readyState >= 2 is enough to start playback and buffer ahead during the
      // fade; retry on the next tick if it's still empty.
      if (!sideReadyRef[side].current && el.readyState < 2) return;
      sideReadyRef[side].current = true;
      crossfadingRef.current = true;
      const oldSide = activeIdxRef.current; // capture BEFORE swapping below
      const fd = Math.min(cf, Math.max(0.5, remaining || cf));
      setGainImmediate(side, 0);
      mirrorPlayback(el);
      const p = el.play();
      Promise.resolve(p)
        .then(() => {
          rampGain(side, 1, fd);
          rampGain(oldSide, 0, fd);
        })
        .catch(() => {});
      // The new track is now "current" — switch active side so UI follows it.
      activeIdxRef.current = side;
      sideReadyRef[side].current = false;
      preloadedTargetRef.current = null;
      setCurrentIndex(targetIndex); // track-change effect sees it's loaded + crossfading -> skips reload
      if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current);
      crossfadeTimerRef.current = setTimeout(() => {
        const oldEl = els()[oldSide];
        if (oldEl) {
          try {
            oldEl.pause();
          } catch {}
        }
        setGainImmediate(oldSide, 0);
        crossfadingRef.current = false;
      }, (fd + 0.4) * 1000);
    },
    [preloadSide, mirrorPlayback, setGainImmediate, rampGain]
  );

  // --- per-track load: crossfade engine handles natural advances, manual
  // changes load on the active element. ---
  useEffect(() => {
    const track = currentTrack;
    if (!track) {
      cancelCrossfade();
      const a = activeEl();
      if (a) {
        a.pause();
        a.removeAttribute("src");
        a.load();
      }
      setGainImmediate(activeIdxRef.current, 0);
      sideLoadedIdRef[activeIdxRef.current].current = null;
      setPosition(0);
      setDuration(0);
      setIsPlaying(false);
      return;
    }
    // Crossfade already started this track on the active element — leave it.
    if (
      sideLoadedIdRef[activeIdxRef.current].current === track.id &&
      crossfadingRef.current
    ) {
      return;
    }
    loadOnActive(track);
  }, [currentTrack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preload the upcoming track on the inactive element as soon as the current
  // track starts, so a crossfade has a buffered source ready WELL before the
  // transition point (instead of only cf+3s before the end, which often misses).
  useEffect(() => {
    const ci = currentIndexRef.current;
    const q = queueRef.current;
    if (ci < 0 || !q.length) return;
    let n = -1;
    if (ci + 1 < q.length) n = ci + 1;
    else if (repeatRef.current === "all" && q.length) n = 0;
    if (n === -1 || !q[n]) return;
    const side = inactiveIdx();
    if (
      sideLoadedIdRef[side].current === q[n].id &&
      sideReadyRef[side].current
    )
      return;
    preloadedTargetRef.current = n;
    preloadSide(n);
  }, [currentTrack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- listeners (attached once to both elements) ---
  useEffect(() => {
    const cleanups = els().map((a) => {
      if (!a) return () => {};
      const onTime = () => {
        if (a === activeEl()) handleTimeRef.current(a);
      };
      const onDur = () => {
        if (a === activeEl()) setDuration(a.duration || 0);
      };
      const onPlay = () => {
        if (a === activeEl()) setIsPlaying(true);
      };
      const onPause = () => {
        if (a === activeEl()) setIsPlaying(false);
      };
      const onEnded = () => {
        if (a === activeEl()) handleEndedRef.current();
      };
      a.addEventListener("timeupdate", onTime);
      a.addEventListener("durationchange", onDur);
      a.addEventListener("loadedmetadata", onDur);
      a.addEventListener("play", onPlay);
      a.addEventListener("pause", onPause);
      a.addEventListener("ended", onEnded);
      return () => {
        a.removeEventListener("timeupdate", onTime);
        a.removeEventListener("durationchange", onDur);
        a.removeEventListener("loadedmetadata", onDur);
        a.removeEventListener("play", onPlay);
        a.removeEventListener("pause", onPause);
        a.removeEventListener("ended", onEnded);
      };
    });
    return () => cleanups.forEach((c) => c());
  }, []);

  // timeupdate logic (reads latest via ref)
  useEffect(() => {
    handleTimeRef.current = (a) => {
      const cur = a.currentTime || 0;
      setPosition(cur);
      const s = getTransitionSettings();
      if (!isTransitionActive(s) || crossfadingRef.current) return;
      const d = a.duration;
      if (!d || !isFinite(d)) return;
      const remaining = d - cur;
      if (remaining <= 0) return;
      const qi = queueRef.current;
      const ci = currentIndexRef.current;
      let n = -1;
      if (repeatRef.current !== "one") {
        if (ci + 1 < qi.length) n = ci + 1;
        else if (repeatRef.current === "all" && qi.length) n = 0;
      }
      if (n === -1) return; // queue ends here — let the ended handler auto-radio
      const cf = s.crossfadeSeconds;
      // Preload a little early so the crossfade can start on time.
      if (remaining <= cf + 3 && remaining > cf && preloadedTargetRef.current !== n) {
        preloadedTargetRef.current = n;
        preloadSide(n);
      }
      if (remaining <= cf && remaining > 0) beginCrossfade(n, cf, remaining);
    };
  }, [preloadSide, beginCrossfade]);

  // continued play counting
  const countPlay = useCallback((track) => {
    if (!track || countedRef.current.has(track.id)) return;
    countedRef.current.add(track.id);
    base44.functions.invoke("registerPlay", { track_id: track.id }).catch(() => {});
    try {
      const KEY = "public:recently_played";
      const v = JSON.parse(localStorage.getItem(KEY) || "[]");
      const s = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        uploader_name: track.uploader_name,
        uploader_id: track.uploader_id,
        cover_art_url: track.cover_art_url,
        audio_url: track.audio_url,
        duration_seconds: track.duration_seconds,
        genre: track.genre,
        explicit: track.explicit,
        is_published: true,
      };
      const next = [s, ...v.filter((t) => t.id !== s.id)].slice(0, 20);
      localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("recentplays:change"));
    } catch {}
  }, []);

  useEffect(() => {
    if (isPlaying && currentTrack) countPlay(currentTrack);
  }, [isPlaying, currentTrack?.id]);

  const nextIndex = useCallback(() => {
    if (!queue.length) return -1;
    if (shuffle && queue.length > 1) {
      let n;
      do {
        n = Math.floor(Math.random() * queue.length);
      } while (n === currentIndex);
      return n;
    }
    if (currentIndex + 1 < queue.length) return currentIndex + 1;
    return repeat === "all" ? 0 : -1;
  }, [queue, currentIndex, shuffle, repeat]);

  const extendWithGenreRadio = useCallback(async (track) => {
    if (!track?.id || autoQueueLoadingRef.current) return false;
    autoQueueLoadingRef.current = true;
    try {
      const picks = await buildAutoQueue(
        track,
        queueRef.current.map((t) => t.id),
        15
      );
      if (!picks.length) return false;
      const start = queueRef.current.length;
      setQueue((prev) => [...prev, ...picks]);
      setCurrentIndex(start);
      return true;
    } finally {
      autoQueueLoadingRef.current = false;
    }
  }, []);

  // ended handler (only the active element, only when not crossfading)
  useEffect(() => {
    handleEndedRef.current = async () => {
      if (crossfadingRef.current) return;
      if (repeat === "one") {
        const a = activeEl();
        if (a) {
          a.currentTime = 0;
          a.play().catch(() => {});
        }
        return;
      }
      const n = nextIndex();
      if (n !== -1) {
        setCurrentIndex(n);
        return;
      }
      if (repeat === "off" && currentTrack) {
        const ok = await extendWithGenreRadio(currentTrack);
        if (ok) return;
      }
      setIsPlaying(false);
    };
  }, [repeat, nextIndex, currentTrack, extendWithGenreRadio]);

  // volume / mute / rate apply to both elements
  useEffect(() => {
    els().forEach((a) => a && (a.volume = volume));
  }, [volume]);
  useEffect(() => {
    els().forEach((a) => a && (a.muted = muted));
  }, [muted]);
  useEffect(() => {
    els().forEach((a) => a && (a.playbackRate = playbackRate));
  }, [playbackRate]);

  const playTrackAt = useCallback((tracks, index = 0) => {
    if (!tracks || !tracks.length) return;
    countedRef.current = new Set();
    setQueue(tracks);
    setCurrentIndex(index);
  }, []);

  const togglePlay = useCallback(() => {
    const a = activeEl();
    if (!a || !currentTrack) return;
    if (a.paused) {
      ensureGraph();
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
      if (!crossfadingRef.current) setGainImmediate(activeIdxRef.current, 1);
      a.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      a.pause();
      setIsPlaying(false);
    }
  }, [currentTrack, ensureGraph, setGainImmediate]);

  const seek = useCallback((time) => {
    const a = activeEl();
    if (!a) return;
    a.currentTime = time;
    setPosition(time);
  }, []);

  const setVolume = useCallback((v) => {
    setVolumeState(v);
    els().forEach((a) => a && (a.volume = v));
    if (v > 0) setMuted(false);
  }, []);

  // Crossfade-aware skip: if transitions are on AND the upcoming track is
  // already preloaded+ready on the inactive element, blend into it; otherwise
  // fall back to a hard cut via setCurrentIndex -> loadOnActive.
  const transitionTo = useCallback(
    (targetIndex) => {
      if (targetIndex < 0 || targetIndex >= queueRef.current.length) return;
      const s = getTransitionSettings();
      const side = inactiveIdx();
      const target = queueRef.current[targetIndex];
      const ready =
        !crossfadingRef.current &&
        target &&
        sideLoadedIdRef[side].current === target.id &&
        sideReadyRef[side].current;
      if (isTransitionActive(s) && ready) {
        const a = activeEl();
        const remaining =
          a && a.duration && isFinite(a.duration)
            ? a.duration - (a.currentTime || 0)
            : s.crossfadeSeconds;
        beginCrossfade(targetIndex, s.crossfadeSeconds, remaining);
      } else {
        setCurrentIndex(targetIndex);
      }
    },
    [beginCrossfade]
  );

  const next = useCallback(() => {
    const n = nextIndex();
    if (n !== -1) transitionTo(n);
  }, [nextIndex, transitionTo]);

  const prev = useCallback(() => {
    const a = activeEl();
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      setPosition(0);
      return;
    }
    if (currentIndex - 1 >= 0) setCurrentIndex(currentIndex - 1);
    else if (repeat === "all") setCurrentIndex(queue.length - 1);
  }, [currentIndex, queue.length, repeat]);

  const getBars = useCallback((seed) => {
    let s = 0;
    for (const c of String(seed || "x")) s = (s * 31 + c.charCodeAt(0)) | 0;
    const bars = [];
    for (let i = 0; i < 64; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const v = (s % 1000) / 1000;
      bars.push(0.25 + 0.75 * v);
    }
    return bars;
  }, []);

  const setPlaybackRate = useCallback((r) => {
    setPlaybackRateState(r);
    els().forEach((a) => a && (a.playbackRate = r));
  }, []);

  const skipBy = useCallback((delta) => {
    const a = activeEl();
    if (!a) return;
    const t = Math.max(0, Math.min(a.duration || 0, (a.currentTime || 0) + delta));
    a.currentTime = t;
    setPosition(t);
  }, []);

  const addToQueue = useCallback((track) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const addManyToQueue = useCallback((tracks) => {
    setQueue((prev) => [...prev, ...tracks]);
  }, []);

  const removeFromQueue = useCallback((index) => {
    setCurrentIndex((ci) => {
      setQueue((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        return prev.filter((_, i) => i !== index);
      });
      if (index < ci) return ci - 1;
      if (index === ci) return -1;
      return ci;
    });
  }, []);

  const playQueueItem = useCallback(
    (index) => {
      if (index >= 0 && index < queue.length) {
        setCurrentIndex(index);
        countedRef.current = new Set();
      }
    },
    [queue.length]
  );

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(-1);
  }, []);

  const setSleepTimer = useCallback((minutes) => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    if (!minutes || minutes <= 0) {
      setSleepTimerEndsAt(null);
      return;
    }
    const ends = Date.now() + minutes * 60 * 1000;
    setSleepTimerEndsAt(ends);
    sleepTimerRef.current = setTimeout(() => {
      const a = activeEl();
      if (a) a.pause();
      setIsPlaying(false);
      setSleepTimerEndsAt(null);
      sleepTimerRef.current = null;
    }, minutes * 60 * 1000);
  }, []);

  const value = {
    queue,
    setQueue,
    currentIndex,
    setCurrentIndex,
    isPlaying,
    position,
    duration,
    volume,
    muted,
    repeat,
    shuffle,
    currentTrack,
    togglePlay,
    seek,
    setVolume,
    setMuted,
    next,
    prev,
    playTrackAt,
    setRepeat,
    setShuffle,
    getBars,
    playbackRate,
    setPlaybackRate,
    skipBy,
    addToQueue,
    addManyToQueue,
    removeFromQueue,
    playQueueItem,
    clearQueue,
    sleepTimerEndsAt,
    setSleepTimer,
    getAnalyser,
    enableAnalyser,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}