import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { base44 } from "@/api/base44Client";
import { getRecord, listRecords } from "@/lib/offlineCache";
import { buildAutoQueue } from "@/lib/autoQueue";
import { useWakeLock } from "@/hooks/useWakeLock";
import {
  getTransitionSettings,
  isTransitionActive,
  isGapless,
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
        // Explicitly preserve pitch so playback never sounds altered (sped up,
        // slowed, or chipmunked) even if playbackRate changes or a browser
        // defaults preservesPitch to false.
        try { a.preservesPitch = true; } catch {}
        try { a.mozPreservesPitch = true; } catch {}
        try { a.webkitPreservesPitch = true; } catch {}
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
  const readyListenerRef = [useRef(null), useRef(null)];

  const crossfadingRef = useRef(false);
  const pendingSeekRef = useRef(null);
  const autoPlayOnLoadRef = useRef(true);
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
  const [volume, setVolumeState] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem("public:player_volume"));
      return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 1;
    } catch {
      return 1;
    }
  });
  const [muted, setMutedState] = useState(() => {
    try {
      return localStorage.getItem("public:player_muted") === "true";
    } catch {
      return false;
    }
  });
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
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
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

  // Web Audio is only needed for blending transitions (crossfade/AutoMix/
  // gapless) or the Color Pulse visualizer. When it's NOT needed we leave the
  // <audio> elements un-routed and play them natively — this is the workaround
  // for iOS backgrounding: a routed (MediaElementSource) element goes silent a
  // few seconds after the app is backgrounded because iOS suspends the
  // AudioContext, while a plain media element keeps playing on an installed
  // (Home-Screen) PWA. Transitions/visualizer opt back in via ensureGraph().
  const graphNeeded = useCallback(() => {
    const s = getTransitionSettings();
    return isTransitionActive(s) || isGapless(s);
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

  // Equal-power crossfade curve: avoids the perceived loudness dip that a
  // linear 1->0 / 0->1 ramp produces in the middle of a blend.
  const rampGainEqualPower = useCallback((side, fadeIn, dur) => {
    const ctx = audioCtxRef.current;
    const g = gainRefs[side].current;
    if (!ctx || !g || dur <= 0) return;
    const steps = Math.max(2, Math.min(64, Math.round(dur * 24)));
    const curve = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      const f = i / (steps - 1);
      const v = fadeIn ? Math.sin((f * Math.PI) / 2) : Math.cos((f * Math.PI) / 2);
      curve[i] = Math.max(0.0001, v);
    }
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueCurveAtTime(curve, t, dur);
  }, []);

  // --- offline-blob-aware url resolution for a given side ---
  // While online we stream from the remote URL; while offline we fall back to
  // the locally cached blob — so the player source automatically follows the
  // connection.
  const resolveUrl = useCallback(async (track, side) => {
    sideLoadedIdRef[side].current = track.id;
    const url = track.audio_url;
    const online =
      typeof navigator === "undefined" ? true : navigator.onLine;
    let blobUrl = null;
    if (!online) {
      try {
        const rec = await getRecord(track.id);
        if (rec && rec._blob) blobUrl = URL.createObjectURL(rec._blob);
      } catch {}
    }
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
      if (readyListenerRef[is].current) {
        ie.removeEventListener("canplay", readyListenerRef[is].current);
        readyListenerRef[is].current = null;
      }
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
      if (graphNeeded()) ensureGraph();
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
      setGainImmediate(side, 1);
      const shouldPlay = autoPlayOnLoadRef.current;
      autoPlayOnLoadRef.current = true;
      if (shouldPlay) {
        el
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      } else {
        setIsPlaying(false);
      }
    },
    [resolveUrl, mirrorPlayback, ensureGraph, setGainImmediate, cancelCrossfade, graphNeeded]
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
      // Drop any still-pending ready listener from a previous preload on this
      // side so it can't fire for the wrong track and falsely mark us ready.
      if (readyListenerRef[side].current) {
        el.removeEventListener("canplay", readyListenerRef[side].current);
        readyListenerRef[side].current = null;
      }
      const url = await resolveUrl(track, side);
      // If the active side changed hands while we were resolving, bail.
      if (side !== inactiveIdx()) return;
      mirrorPlayback(el);
      el.src = url;
      el.load();
      const markReady = () => {
        sideReadyRef[side].current = true;
        readyListenerRef[side].current = null;
      };
      readyListenerRef[side].current = markReady;
      el.addEventListener("canplay", markReady, { once: true });
      if (el.readyState >= 4) {
        sideReadyRef[side].current = true;
        readyListenerRef[side].current = null;
      }
    },
    [resolveUrl, mirrorPlayback]
  );

  // Compute the upcoming track index and pre-buffer it on the inactive element
  // (unless it's already loaded+ready). Used right after a track loads AND after
  // a crossfade completes, so the next transition always has a ready source.
  const preloadNextTrack = useCallback(() => {
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
  }, [preloadSide]);

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
      // Wait until the upcoming track has enough buffered to start cleanly
      // (canplay / readyState 4); starting sooner causes micro-stutters.
      if (!sideReadyRef[side].current) return;
      crossfadingRef.current = true;
      const oldSide = activeIdxRef.current; // capture BEFORE swapping below
      const fd = Math.min(cf, Math.max(0.5, remaining || cf));
      setGainImmediate(side, 0);
      mirrorPlayback(el);
      const p = el.play();
      // Equal-power blend: new track power rises (sin) as old track power falls (cos).
      Promise.resolve(p)
        .then(() => {
          rampGainEqualPower(side, true, fd);
          rampGainEqualPower(oldSide, false, fd);
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
        // The inactive element is now free — pre-buffer the upcoming track.
        preloadNextTrack();
      }, (fd + 0.4) * 1000);
    },
    [preloadSide, mirrorPlayback, setGainImmediate, rampGainEqualPower, preloadNextTrack]
  );

  // TRUE GAPLESS: no fade at all. The upcoming track is already decoded and
  // buffered on the inactive element, so we butt-join it to the outgoing track
  // — swap the gains in the same instant and hard-stop the old element. Fired a
  // hair (~0.2s) before the reported end because `timeupdate` only ticks ~4x a
  // second and the tail of that window is decay/silence.
  const beginGapless = useCallback(
    (targetIndex) => {
      const side = inactiveIdx();
      const el = els()[side];
      const track = queueRef.current[targetIndex];
      if (!el || !track) return;
      if (sideLoadedIdRef[side].current !== track.id) {
        preloadedTargetRef.current = targetIndex;
        preloadSide(targetIndex);
        return;
      }
      if (!sideReadyRef[side].current) return;

      const oldSide = activeIdxRef.current;
      crossfadingRef.current = true; // guards the reload + ended handlers
      try {
        el.currentTime = 0;
      } catch {}
      mirrorPlayback(el);
      setGainImmediate(side, 1);
      el.play().catch(() => {});
      const oldEl = els()[oldSide];
      if (oldEl) {
        try {
          oldEl.pause();
        } catch {}
      }
      setGainImmediate(oldSide, 0);

      activeIdxRef.current = side;
      sideReadyRef[side].current = false;
      preloadedTargetRef.current = null;
      setCurrentIndex(targetIndex);
      if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current);
      crossfadeTimerRef.current = setTimeout(() => {
        crossfadingRef.current = false;
        preloadNextTrack();
      }, 300);
    },
    [preloadSide, mirrorPlayback, setGainImmediate, preloadNextTrack]
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
  // While a crossfade is in flight the inactive element is still playing the
  // outgoing tail — don't overwrite its src (that would cut the fade short).
  // The crossfade timer calls preloadNextTrack() once the blend completes.
  useEffect(() => {
    if (crossfadingRef.current) return;
    preloadNextTrack();
  }, [currentTrack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Report playback position/duration to the OS Media Session. iOS uses this
  // (together with the now-playing metadata + action handlers) to recognize a
  // "controllable" media session — which is what lets a standalone (Home-Screen)
  // PWA keep Web-Audio-routed audio alive in the background / on the lock screen.
  const syncPositionState = useCallback((a) => {
    if (!a || !("mediaSession" in navigator)) return;
    const d = a.duration;
    if (!d || !isFinite(d)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: d,
        position: Math.min(Math.max(0, a.currentTime || 0), d),
        playbackRate: a.playbackRate || 1,
      });
    } catch {}
  }, []);

  // --- listeners (attached once to both elements) ---
  useEffect(() => {
    const cleanups = els().map((a) => {
      if (!a) return () => {};
      const onTime = () => {
        if (a === activeEl()) handleTimeRef.current(a);
      };
      const onDur = () => {
        if (a !== activeEl()) return;
        setDuration(a.duration || 0);
        syncPositionState(a);
        // Resuming from another device: jump to the saved position as soon as
        // the media is seekable.
        const ps = pendingSeekRef.current;
        if (ps && sideLoadedIdRef[activeIdxRef.current].current === ps.id) {
          try {
            a.currentTime = ps.at;
            setPosition(ps.at);
          } catch {}
          pendingSeekRef.current = null;
        }
      };
      const onPlay = () => {
        if (a === activeEl()) {
          setIsPlaying(true);
          syncPositionState(a);
        }
      };
      const onPause = () => {
        if (a === activeEl()) {
          setIsPlaying(false);
          syncPositionState(a);
        }
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
      syncPositionState(a);
      const s = getTransitionSettings();
      const gapless = isGapless(s);
      if ((!isTransitionActive(s) && !gapless) || crossfadingRef.current) return;
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
      if (gapless) {
        const side = inactiveIdx();
        if (remaining <= 6 && sideLoadedIdRef[side].current !== qi[n].id) {
          preloadedTargetRef.current = n;
          preloadSide(n);
        }
        if (remaining <= 0.2) beginGapless(n);
        return;
      }
      const cf = s.crossfadeSeconds;
      // Preload a little early so the crossfade can start on time.
      if (remaining <= cf + 3 && remaining > cf && preloadedTargetRef.current !== n) {
        preloadedTargetRef.current = n;
        preloadSide(n);
      }
      if (remaining <= cf && remaining > 0) beginCrossfade(n, cf, remaining);
    };
  }, [preloadSide, beginCrossfade, beginGapless]);

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

  // Build a playable queue entirely from the offline cache — used when the
  // device drops its connection so the next track is always something the
  // user can actually hear instead of a remote URL that would fail to load.
  const getOfflineQueue = useCallback(async () => {
    try {
      const recs = await listRecords();
      if (!recs.length) return null;
      recs.sort((a, b) => (b._savedAt || 0) - (a._savedAt || 0));
      return recs.map((r) => ({
        id: r.id,
        title: r.title,
        artist: r.artist,
        uploader_name: r.uploader_name,
        uploader_id: r.uploader_id,
        cover_art_url: r.cover_art_url,
        audio_url: r.audio_url,
        duration_seconds: r.duration_seconds,
        genre: r.genre,
        explicit: r.explicit,
        is_published: true,
      }));
    } catch {
      return null;
    }
  }, []);

  const advanceOffline = useCallback(async () => {
    const tracks = await getOfflineQueue();
    if (!tracks || !tracks.length) {
      setIsPlaying(false);
      return;
    }
    const curId = currentTrack?.id;
    const idx = tracks.findIndex((t) => t.id === curId);
    const nextIdx = idx >= 0 && idx + 1 < tracks.length ? idx + 1 : 0;
    countedRef.current = new Set();
    setQueue(tracks);
    setCurrentIndex(nextIdx);
  }, [getOfflineQueue, currentTrack]);

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
      // Lost connection? Fall back to offline tracks so listening never stops.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        advanceOffline();
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
  }, [repeat, nextIndex, currentTrack, extendWithGenreRadio, advanceOffline]);

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

  // Hand off playback from another device: load the track and seek to where
  // that device left off, as soon as the media reports it's seekable.
  const resumeTrack = useCallback((track, atSeconds = 0, autoplay = true) => {
    if (!track) return;
    pendingSeekRef.current = { id: track.id, at: Math.max(0, atSeconds) };
    autoPlayOnLoadRef.current = autoplay;
    countedRef.current = new Set();
    setQueue([track]);
    setCurrentIndex(0);
  }, []);

  // Play the active element, resuming a suspended AudioContext FIRST. WebKit
  // auto-suspends the AudioContext while audio is paused; if we call play()
  // before the context resumes, the element advances but the routed graph is
  // silent — the "volume disappears after pause" bug. await resume, then play.
  const resumeAndPlay = useCallback(
    (a) => {
      const ctx = audioCtxRef.current;
      const run = () => {
        if (!crossfadingRef.current) setGainImmediate(activeIdxRef.current, 1);
        return a
          .play()
          .then(() => {
            setIsPlaying(true);
            syncPositionState(a);
            // iOS WebKit leaves a MediaElementSource-routed element SILENT
            // after a pause/resume even though it reports "playing" — the
            // classic "volume disappears when I press play again" bug. A tiny
            // seek nudge forces WebKit to re-arm the graph's audio output.
            // Only when the graph is active (routed); native playback is fine.
            if (audioCtxRef.current && isFinite(a.currentTime)) {
              try {
                a.currentTime = Math.max(0, a.currentTime - 0.05);
              } catch {}
            }
          })
          .catch(() => {});
      };
      if (ctx && ctx.state === "suspended") {
        return ctx.resume().then(run).catch(() => {});
      }
      return run();
    },
    [setGainImmediate, syncPositionState]
  );

  const togglePlay = useCallback(() => {
    const a = activeEl();
    if (!a || !currentTrack) return;
    if (a.paused) {
      if (graphNeeded()) ensureGraph();
      resumeAndPlay(a);
    } else {
      a.pause();
      setIsPlaying(false);
    }
  }, [currentTrack, ensureGraph, graphNeeded, resumeAndPlay]);

  const seek = useCallback((time) => {
    const a = activeEl();
    if (!a) return;
    a.currentTime = time;
    setPosition(time);
    syncPositionState(a);
  }, [syncPositionState]);

  const setMuted = useCallback((m) => {
    setMutedState(m);
    try {
      localStorage.setItem("public:player_muted", String(m));
    } catch {}
  }, []);

  const setVolume = useCallback((v) => {
    setVolumeState(v);
    try {
      localStorage.setItem("public:player_volume", String(v));
    } catch {}
    els().forEach((a) => a && (a.volume = v));
    if (v > 0) setMuted(false);
  }, [setMuted]);

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
    // No connection? Skip ahead using the offline cache instead of a remote URL.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      advanceOffline();
      return;
    }
    const n = nextIndex();
    if (n !== -1) {
      transitionTo(n);
      return;
    }
    // Nothing queued after this one — keep the music going with a similar track.
    if (currentTrack) extendWithGenreRadio(currentTrack);
  }, [nextIndex, transitionTo, currentTrack, extendWithGenreRadio, advanceOffline]);

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

  // Reorder queued tracks. Only positions after the current track are ever
  // moved, so currentIndex (and playback) stays untouched.
  const moveInQueue = useCallback((from, to) => {
    setQueue((prev) => {
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= prev.length ||
        to >= prev.length
      )
        return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
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

  // Dedicated resume / pause so the lock-screen "play" action always plays
  // (toggling on a "play" event could accidentally pause if iOS double-fires).
  const resumePlayback = useCallback(() => {
    const a = activeEl();
    if (!a || !currentTrack) return;
    // The page may have been frozen by the OS while backgrounded, leaving the
    // element with no source / nothing decoded. Reload the current track so
    // the lock-screen play button always produces sound instead of no-op.
    if (!a.src || a.readyState === 0) {
      loadOnActive(currentTrack);
      return;
    }
    if (graphNeeded()) ensureGraph();
    resumeAndPlay(a);
  }, [currentTrack, ensureGraph, graphNeeded, loadOnActive, resumeAndPlay]);

  const pausePlayback = useCallback(() => {
    const a = activeEl();
    if (!a) return;
    a.pause();
    setIsPlaying(false);
  }, []);

  // iOS suspends the AudioContext when a standalone PWA is backgrounded /
  // the screen locks, which silences Web-Audio-routed playback. On return to
  // the foreground, re-arm the context and resume the track if it was playing.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
      if (!isPlayingRef.current) return;
      const a = activeEl();
      if (a && a.paused) {
        if (!crossfadingRef.current) setGainImmediate(activeIdxRef.current, 1);
        a.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    };
    // Older Android WebViews fire the prefixed variant.
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("webkitvisibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("webkitvisibilitychange", onVis);
    };
  }, [setGainImmediate]);

  // When the connection comes back, switch the currently-playing track from
  // the offline cache blob back to streaming — preserving the playback
  // position so the listener doesn't hear a jump.
  useEffect(() => {
    const handleOnline = () => {
      if (crossfadingRef.current) return;
      const side = activeIdxRef.current;
      const a = els()[side];
      const t = queueRef.current[currentIndexRef.current];
      if (!a || !t || !t.audio_url) return;
      if (!blobUrlRefs[side].current) return; // not currently on a cache blob
      const wasPlaying = isPlayingRef.current;
      const pos = a.currentTime || 0;
      URL.revokeObjectURL(blobUrlRefs[side].current);
      blobUrlRefs[side].current = null;
      const token = ++loadTokenRef.current;
      a.src = t.audio_url;
      a.load();
      const onReady = () => {
        a.removeEventListener("loadedmetadata", onReady);
        if (token !== loadTokenRef.current) return;
        if (isFinite(pos)) {
          try { a.currentTime = pos; } catch {}
          setPosition(pos);
        }
        if (wasPlaying) {
          const ctx = audioCtxRef.current;
          const doPlay = () =>
            a.play().then(() => setIsPlaying(true)).catch(() => {});
          if (ctx && ctx.state === "suspended")
            ctx.resume().then(doPlay).catch(() => {});
          else doPlay();
        }
      };
      a.addEventListener("loadedmetadata", onReady);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // Keep the screen awake while a track is actively playing so iOS doesn't
  // auto-lock and suspend the audio engine on the open page.
  useWakeLock(isPlaying && !!currentTrack);

  // --- Media Session API: lock-screen / Control Center metadata + controls ---
  // Without this, iOS falls back to the app name + icon instead of the track's
  // title, artist, and cover art on the lock-screen / now-playing widget.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const t = currentTrack;
    if (!t) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
      return;
    }
    // Multiple sizes widen compatibility: iOS lock screen wants 512+,
    // Android notifications often prefer a smaller bitmap.
    const artwork = t.cover_art_url
      ? [
          { src: t.cover_art_url, sizes: "96x96", type: "image/jpeg" },
          { src: t.cover_art_url, sizes: "128x128", type: "image/jpeg" },
          { src: t.cover_art_url, sizes: "192x192", type: "image/jpeg" },
          { src: t.cover_art_url, sizes: "256x256", type: "image/jpeg" },
          { src: t.cover_art_url, sizes: "384x384", type: "image/jpeg" },
          { src: t.cover_art_url, sizes: "512x512", type: "image/jpeg" },
        ]
      : [];
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title || "PUBLIC.",
        artist: t.artist || t.uploader_name || "Unknown",
        album: "PUBLIC.",
        artwork,
      });
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch {}
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const set = (action, handler) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {}
    };
    set("play", () => resumePlayback());
    set("pause", () => pausePlayback());
    set("previoustrack", () => prev());
    set("nexttrack", () => next());
    set("seekto", (d) => {
      if (d && typeof d.seekTime === "number") seek(d.seekTime);
    });
    return () => {
      ["play", "pause", "previoustrack", "nexttrack", "seekto"].forEach((a) =>
        set(a, null)
      );
    };
  }, [resumePlayback, pausePlayback, prev, next, seek]);

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
    resumeTrack,
    setRepeat,
    setShuffle,
    getBars,
    playbackRate,
    setPlaybackRate,
    skipBy,
    addToQueue,
    addManyToQueue,
    removeFromQueue,
    moveInQueue,
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