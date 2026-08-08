import { useRef, useState, useEffect, useCallback } from "react";

// Equal-power crossfade curve so the blend never dips in perceived loudness.
function computeGains(cf, volumes) {
  const a = Math.cos(cf * Math.PI / 2) * volumes[0];
  const b = Math.sin(cf * Math.PI / 2) * volumes[1];
  return [a, b];
}

/**
 * Self-contained dual-deck DJ engine. Creates its own AudioContext + two
 * <audio> elements (independent from the main PlayerContext so the mix table
 * never collides with background playback). Each deck routes through its own
 * gain + analyser into a shared master, and the crossfader drives the two
 * gains with an equal-power curve.
 */
export function useMixEngine() {
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const elsRef = [useRef(null), useRef(null)];
  const gainRefs = [useRef(null), useRef(null)];
  const analyserRefs = [useRef(null), useRef(null)];

  const [tracks, setTracks] = useState([null, null]);
  const [playing, setPlaying] = useState([false, false]);
  const [positions, setPositions] = useState([0, 0]);
  const [durations, setDurations] = useState([0, 0]);
  const [volumes, setVolumes] = useState([0.85, 0.85]);
  const [pitches, setPitches] = useState([1, 1]);
  const [crossfader, setCrossfaderState] = useState(0.5);

  // Create the two audio elements once and wire their media events.
  useEffect(() => {
    [0, 1].forEach((i) => {
      if (elsRef[i].current) return;
      const a = new Audio();
      try { a.crossOrigin = "anonymous"; } catch {}
      a.preload = "auto";
      elsRef[i].current = a;
    });
    const cleanups = [0, 1].map((i) => {
      const a = elsRef[i].current;
      if (!a) return () => {};
      const onTime = () =>
        setPositions((p) => { const n = [...p]; n[i] = a.currentTime || 0; return n; });
      const onDur = () =>
        setDurations((d) => { const n = [...d]; n[i] = a.duration || 0; return n; });
      const onPlay = () => setPlaying((p) => { const n = [...p]; n[i] = true; return n; });
      const onPause = () => setPlaying((p) => { const n = [...p]; n[i] = false; return n; });
      const onEnded = () => setPlaying((p) => { const n = [...p]; n[i] = false; return n; });
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
    return () => {
      cleanups.forEach((c) => c());
      [0, 1].forEach((i) => {
        if (elsRef[i].current) {
          elsRef[i].current.pause();
          elsRef[i].current.src = "";
        }
      });
    };
  }, []);

  // Lazily build the Web Audio graph (must follow a user gesture).
  const ensureGraph = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
      [0, 1].forEach((i) => {
        const el = elsRef[i].current;
        if (!el) return;
        const src = ctx.createMediaElementSource(el);
        const g = ctx.createGain();
        const an = ctx.createAnalyser();
        an.fftSize = 128;
        an.smoothingTimeConstant = 0.8;
        src.connect(g);
        g.connect(an);
        an.connect(master);
        gainRefs[i].current = g;
        analyserRefs[i].current = an;
      });
      ctxRef.current = ctx;
      masterRef.current = master;
      return ctx;
    } catch {
      return null;
    }
  }, []);

  // Re-apply deck gains whenever the crossfader or per-deck volumes move.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const [ga, gb] = computeGains(crossfader, volumes);
    const t = ctx.currentTime;
    gainRefs[0].current?.gain.setTargetAtTime(ga, t, 0.02);
    gainRefs[1].current?.gain.setTargetAtTime(gb, t, 0.02);
  }, [crossfader, volumes]);

  // Pitch / playback rate mirrors straight onto the elements.
  useEffect(() => {
    [0, 1].forEach((i) => {
      const a = elsRef[i].current;
      if (a) a.playbackRate = pitches[i];
    });
  }, [pitches]);

  const loadTrack = useCallback((index, track) => {
    ensureGraph();
    const ctx = ctxRef.current;
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    const a = elsRef[index].current;
    if (!a || !track?.audio_url) return;
    a.pause();
    a.src = track.audio_url;
    a.load();
    setTracks((t) => { const n = [...t]; n[index] = track; return n; });
    setPlaying((p) => { const n = [...p]; n[index] = false; return n; });
    setPositions((p) => { const n = [...p]; n[index] = 0; return n; });
  }, [ensureGraph]);

  const play = useCallback((index) => {
    ensureGraph();
    const ctx = ctxRef.current;
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    const a = elsRef[index].current;
    if (!a || !a.src) return;
    a.play().catch(() => {});
  }, [ensureGraph]);

  const pause = useCallback((index) => {
    elsRef[index].current?.pause();
  }, []);

  const togglePlay = useCallback((index) => {
    const a = elsRef[index].current;
    if (!a || !a.src) return;
    if (a.paused) play(index); else pause(index);
  }, [play, pause]);

  const seek = useCallback((index, t) => {
    const a = elsRef[index].current;
    if (!a) return;
    a.currentTime = t;
    setPositions((p) => { const n = [...p]; n[index] = t; return n; });
  }, []);

  const cue = useCallback((index) => seek(index, 0), [seek]);

  const setVolume = useCallback((index, v) => {
    setVolumes((vol) => { const n = [...vol]; n[index] = v; return n; });
  }, []);

  const setPitch = useCallback((index, r) => {
    setPitches((p) => { const n = [...p]; n[index] = r; return n; });
  }, []);

  const setCrossfader = useCallback((v) => setCrossfaderState(v), []);

  const getAnalyser = useCallback((index) => analyserRefs[index].current, []);

  return {
    tracks, playing, positions, durations, volumes, pitches, crossfader,
    loadTrack, play, pause, togglePlay, seek, cue,
    setVolume, setPitch, setCrossfader, getAnalyser, ensureGraph,
  };
}