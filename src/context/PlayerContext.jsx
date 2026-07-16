import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { base44 } from "@/api/base44Client";

const PlayerContext = createContext(null);
export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  if (!audioRef.current && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
  }
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

  // swap src when track changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!currentTrack) {
      a.pause();
      a.removeAttribute("src");
      a.load();
      setPosition(0);
      setDuration(0);
      setIsPlaying(false);
      return;
    }
    a.src = currentTrack.audio_url;
    a.load();
    a.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
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
    base44.entities.Track.updateMany(
      { id: track.id },
      { $inc: { play_count: 1 } }
    ).catch(() => {});
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

  const addToQueue = useCallback((track) => {
    setQueue((q) => {
      if (q.some((t) => t.id === track.id)) return q;
      return [...q, track];
    });
  }, []);

  const playNext = useCallback(
    (track) => {
      if (!track) return;
      if (queue.some((t) => t.id === track.id)) return;
      const nq = [...queue];
      const at = Math.max(0, Math.min(currentIndex + 1, nq.length));
      nq.splice(at, 0, track);
      setQueue(nq);
      if (currentIndex < 0) setCurrentIndex(0);
      else if (currentIndex >= at) setCurrentIndex(currentIndex + 1);
    },
    [queue, currentIndex]
  );

  const removeFromQueue = useCallback((trackId) => {
    setQueue((q) => {
      const i = q.findIndex((t) => t.id === trackId);
      if (i === -1) return q;
      const nq = q.filter((t) => t.id !== trackId);
      setCurrentIndex((ci) => {
        if (i < ci) return ci - 1;
        if (i === ci) return Math.min(ci, nq.length - 1);
        return ci;
      });
      return nq;
    });
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
    addToQueue,
    playNext,
    removeFromQueue,
    setRepeat,
    setShuffle,
    getBars,
    playbackRate,
    setPlaybackRate,
    skipBy,
    clearQueue,
    sleepTimerEndsAt,
    setSleepTimer,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}