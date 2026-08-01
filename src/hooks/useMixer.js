import { useRef, useState, useCallback, useEffect } from "react";

/*
  Minimal Web Audio DJ engine: two decks, each routed through
  bass/mid/treble EQ → deck gain → master gain → destination.
  Crossfader uses equal-power (cos/sin) gain law.
*/

function buildDeck(ctx) {
  const el = new Audio();
  el.crossOrigin = "anonymous";
  el.preload = "metadata";

  const src = ctx.createMediaElementSource(el);

  const bass = ctx.createBiquadFilter();
  bass.type = "lowshelf";
  bass.frequency.value = 200;

  const mid = ctx.createBiquadFilter();
  mid.type = "peaking";
  mid.frequency.value = 1000;
  mid.Q.value = 1;

  const treble = ctx.createBiquadFilter();
  treble.type = "highshelf";
  treble.frequency.value = 4000;

  const gain = ctx.createGain();
  gain.gain.value = 0.85;

  src.connect(bass);
  bass.connect(mid);
  mid.connect(treble);
  treble.connect(gain);

  return { el, bass, mid, treble, gain, src };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

const emptyDeckState = () => ({
  track: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  loading: false,
  volume: 0.85, // deck trim
  pitch: 1, // playbackRate
  eq: { bass: 0, mid: 0, treble: 0 }, // dB
});

export function useMixer() {
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const deckARef = useRef(null);
  const deckBRef = useRef(null);
  const xfadeRef = useRef(0.5);
  const volRef = useRef({ A: 0.85, B: 0.85 });
  const rafRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [decks, setDecks] = useState({ A: emptyDeckState(), B: emptyDeckState() });
  const [crossfade, setCrossfadeState] = useState(0.5);
  const [master, setMasterState] = useState(1);

  const ensureCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);
    deckARef.current = buildDeck(ctx);
    deckBRef.current = buildDeck(ctx);
    deckARef.current.gain.connect(masterGain);
    deckBRef.current.gain.connect(masterGain);
    ctxRef.current = ctx;
    masterRef.current = masterGain;
    setReady(true);
    return ctx;
  }, []);

  const applyXfadeGains = useCallback(() => {
    const x = xfadeRef.current;
    const gA = Math.cos(x * (Math.PI / 2));
    const gB = Math.sin(x * (Math.PI / 2));
    const ctx = ctxRef.current;
    if (!ctx || !deckARef.current || !deckBRef.current) return;
    deckARef.current.gain.gain.setTargetAtTime(gA * volRef.current.A, ctx.currentTime, 0.01);
    deckBRef.current.gain.gain.setTargetAtTime(gB * volRef.current.B, ctx.currentTime, 0.01);
  }, []);

  // animation position loop
  useEffect(() => {
    let active = true;
    const tick = () => {
      if (!active) return;
      setDecks((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const key of ["A", "B"]) {
          const d = deckKey(key);
          const el = d?.el;
          if (el && !el.paused && !el.ended) {
            const pos = el.currentTime || 0;
            if (pos !== prev[key].position) {
              next[key] = { ...prev[key], position: pos, duration: el.duration || prev[key].duration || 0 };
              changed = true;
            }
          } else if (el && el.ended && prev[key].isPlaying) {
            next[key] = { ...prev[key], isPlaying: false };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const deckKey = (k) => (k === "A" ? deckARef.current : deckBRef.current);

  const loadTrack = useCallback(
    async (key, track) => {
      const ctx = ensureCtx();
      await ctx.resume().catch(() => {});
      const deck = deckKey(key);
      if (!deck) return;
      setDecks((prev) => ({
        ...prev,
        [key]: { ...prev[key], loading: true, isPlaying: false, position: 0, duration: 0 },
      }));
      deck.el.pause();
      deck.el.src = track.audio_url;
      deck.el.load();
      const onLoaded = () => {
        deck.el.playbackRate = decks[key]?.pitch || 1;
        setDecks((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            track,
            loading: false,
            duration: deck.el.duration || track.duration_seconds || 0,
            position: 0,
          },
        }));
        deck.el.removeEventListener("loadedmetadata", onLoaded);
      };
      deck.el.addEventListener("loadedmetadata", onLoaded);
      // equal-power gain re-apply
      applyXfadeGains();
    },
    [ensureCtx, decks, applyXfadeGains]
  );

  const play = useCallback(
    async (key) => {
      const ctx = ensureCtx();
      await ctx.resume().catch(() => {});
      const deck = deckKey(key);
      if (!deck || !deck.el.src) return;
      try {
        await deck.el.play();
        setDecks((prev) => ({ ...prev, [key]: { ...prev[key], isPlaying: true } }));
      } catch {}
    },
    [ensureCtx]
  );

  const pause = useCallback((key) => {
    const deck = deckKey(key);
    if (!deck) return;
    deck.el.pause();
    setDecks((prev) => ({ ...prev, [key]: { ...prev[key], isPlaying: false } }));
  }, []);

  const toggle = useCallback(
    (key) => {
      const deck = deckKey(key);
      if (!deck || !deck.el.src) return;
      if (deck.el.paused || deck.el.ended) play(key);
      else pause(key);
    },
    [play, pause]
  );

  const seek = useCallback((key, sec) => {
    const deck = deckKey(key);
    if (!deck) return;
    deck.el.currentTime = sec;
    setDecks((prev) => ({ ...prev, [key]: { ...prev[key], position: sec } }));
  }, []);

  const setVolume = useCallback(
    (key, v) => {
      volRef.current = { ...volRef.current, [key]: v };
      setDecks((prev) => ({ ...prev, [key]: { ...prev[key], volume: v } }));
      applyXfadeGains();
    },
    [applyXfadeGains]
  );

  const setPitch = useCallback((key, p) => {
    const deck = deckKey(key);
    if (!deck) return;
    deck.el.playbackRate = p;
    setDecks((prev) => ({ ...prev, [key]: { ...prev[key], pitch: p } }));
  }, []);

  const setEq = useCallback((key, band, db) => {
    const deck = deckKey(key);
    if (!deck) return;
    deck[band].gain.value = db;
    setDecks((prev) => ({
      ...prev,
      [key]: { ...prev[key], eq: { ...prev[key].eq, [band]: db } },
    }));
  }, []);

  const setCrossfade = useCallback(
    (x) => {
      xfadeRef.current = x;
      setCrossfadeState(x);
      applyXfadeGains();
    },
    [applyXfadeGains]
  );

  const setMaster = useCallback((v) => {
    setMasterState(v);
    const ctx = ctxRef.current;
    if (ctx && masterRef.current) masterRef.current.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
  }, []);

  // Sync: set deck B playhead to deck A, match tempo
  const sync = useCallback(() => {
    const a = deckARef.current;
    const b = deckBRef.current;
    if (!a || !b || !a.el.src || !b.el.src) return;
    b.el.currentTime = a.el.currentTime;
    b.el.playbackRate = a.el.playbackRate || 1;
    setDecks((prev) => ({
      ...prev,
      B: { ...prev.B, pitch: a.el.playbackRate || 1, position: a.el.currentTime },
    }));
  }, []);

  // reset eq on unmount-ish; cleanup
  useEffect(() => {
    return () => {
      try {
        deckARef.current?.el.pause();
        deckBRef.current?.el.pause();
        ctxRef.current?.close?.();
      } catch {}
    };
  }, []);

  return {
    ready,
    decks,
    crossfade,
    master,
    ensureCtx,
    loadTrack,
    play,
    pause,
    toggle,
    seek,
    setVolume,
    setPitch,
    setEq,
    setCrossfade,
    setMaster,
    sync,
  };
}

export const clampVol = (v) => clamp(v, 0, 1);