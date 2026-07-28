import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { base44 } from "@/api/base44Client";
import { getRecord } from "@/lib/offlineCache";

const PlayerContext = createContext(null);
export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  if (!audioRef.current && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
    try {
      audioRef.current.crossOrigin = "anonymous";
    } catch {}
  }
  // Offline audio blob URL currently in use (revoked when swapped out)
  const activeBlobUrlRef = useRef(null);
  // Web Audio analyser graph (created once, on first user gesture)
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);

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

  const currentTrack =
    currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  // Lazily create the Web Audio graph (AudioContext + MediaElementSource +
  // AnalyserNode) the first time we need it. Safe to call repeatedly.
  const ensureGraph = useCallback(() => {
    const a = audioRef.current;
    if (!a || audioCtxRef.current) return audioCtxRef.current;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC();
      const src = ctx.createMediaElementSource(a);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      sourceRef.current = src;
      analyserRef.current = analyser;
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

  // volume / mute sync
  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = volume;
  }, [volume]);
  useEffect(() => {
    const a = audioRef.current;
    if (a) a.muted = muted;
  }, [muted]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.playbackRate = playbackRate;
  }, [playbackRate]);

  // swap src when track changes — prefer the offline-cached blob if present
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    let cancelled = false;
    (async () => {
      if (!currentTrack) {
        a.pause();
        a.removeAttribute("src");
        a.load();
        setPosition(0);
        setDuration(0);
        setIsPlaying(false);
        if (activeBlobUrlRef.current) {
          URL.revokeObjectURL(activeBlobUrlRef.current);
          activeBlobUrlRef.current = null;
        }
        return;
      }
      let url = currentTrack.audio_url;
      try {
        const rec = await getRecord(currentTrack.id);
        if (!cancelled && rec && rec._blob) {
          const blobUrl = URL.createObjectURL(rec._blob);
          if (activeBlobUrlRef.current && activeBlobUrlRef.current !== blobUrl) {
            URL.revokeObjectURL(activeBlobUrlRef.current);
          }
          activeBlobUrlRef.current = blobUrl;
          url = blobUrl;
        }
      } catch {}
      if (cancelled) return;
      a.src = url;
      a.load();
      a.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    })();
    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id]);

  // listeners
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setPosition(a.currentTime || 0);
    const onDur = () => setDuration(a.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, []);

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

  // ended handler reads latest via ref
  const handleEndedRef = useRef(() => {});
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnd = () => handleEndedRef.current();
    a.addEventListener("ended", onEnd);
    return () => a.removeEventListener("ended", onEnd);
  }, []);

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

  useEffect(() => {
    handleEndedRef.current = () => {
      if (repeat === "one") {
        const a = audioRef.current;
        if (a) {
          a.currentTime = 0;
          a.play().catch(() => {});
        }
        return;
      }
      const n = nextIndex();
      if (n === -1) {
        setIsPlaying(false);
        return;
      }
      setCurrentIndex(n);
    };
  }, [repeat, nextIndex]);

  const playTrackAt = useCallback((tracks, index = 0) => {
    if (!tracks || !tracks.length) return;
    countedRef.current = new Set();
    setQueue(tracks);
    setCurrentIndex(index);
  }, []);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a || !currentTrack) return;
    if (a.paused) {
      a.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      a.pause();
      setIsPlaying(false);
    }
  }, [currentTrack]);

  const seek = useCallback((time) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = time;
    setPosition(time);
  }, []);

  const setVolume = useCallback((v) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
    if (v > 0) setMuted(false);
  }, []);

  const next = useCallback(() => {
    const n = nextIndex();
    if (n !== -1) setCurrentIndex(n);
  }, [nextIndex]);

  const prev = useCallback(() => {
    const a = audioRef.current;
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
    if (audioRef.current) audioRef.current.playbackRate = r;
  }, []);

  const skipBy = useCallback((delta) => {
    const a = audioRef.current;
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
        const next = prev.filter((_, i) => i !== index);
        return next;
      });
      if (index < ci) return ci - 1;
      if (index === ci) return -1;
      return ci;
    });
  }, []);

  const playQueueItem = useCallback((index) => {
    if (index >= 0 && index < queue.length) {
      setCurrentIndex(index);
      countedRef.current = new Set();
    }
  }, [queue.length]);

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
      const a = audioRef.current;
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