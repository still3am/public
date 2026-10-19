import {sampleListening} from "@/lib/listeningHistory";
import {DEFAULT_MIXER,normalizeMixer,mixerHeadroom,smoothAudioParam} from "@/lib/equalizer";
import {commitAudioHandoff,transitionDuration} from "@/lib/audioHandoff";
import {DEFAULT_PURE,normalizePure,readPure,createPureGraph} from "@/lib/pureAudio";
import {useAudioOutput} from "@/hooks/useAudioOutput";
import {useSafety} from '@/context/SafetyContext';
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
import { getUserGenres } from "@/lib/userGenres";
import { useWakeLock } from "@/hooks/useWakeLock";
import {
  getTransitionSettings,
  isTransitionActive,
  isGapless,
  TRANSITION_MODES,
} from "@/lib/transitions";
import { useAuth } from "@/lib/AuthContext";

const isIOSDevice=()=>typeof navigator!=="undefined"&&(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1));
// Declare music playback so supported WebKit versions keep the audio session
// eligible for background output, including MediaElementSource audio.
function configurePlaybackSession(){
 try{const session=Reflect.get(navigator,"audioSession");if(session&&session.type!=="playback")session.type="playback";}catch{}
}
const PlayerContext = createContext(null);
export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }) {
  const { user } = useAuth();
  const offlineAccountRef=useRef(user?.id);offlineAccountRef.current=user?.id;
  const {blocked}=useSafety();const blockedRef=useRef(blocked);blockedRef.current=blocked;
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
        try { Object.assign(a,{mozPreservesPitch:true}); } catch {}
        try { Object.assign(a,{webkitPreservesPitch:true}); } catch {}
        r.current = a;
      }
    });
  }
  const els = () => [audioRefs[0].current, audioRefs[1].current];

  // Shared Web Audio graph: each element -> its own gain -> analyser -> master -> out
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const masterGainRef = useRef(null);
  const volumeGainRef=useRef(null);
  const gainRefs = [useRef(null), useRef(null)];
  const sourceRefs = [useRef(null), useRef(null)];

  const activeIdxRef = useRef(0);
  const audioOutput=useAudioOutput(audioRefs,activeIdxRef,audioCtxRef);
  const [pure,setPureState]=useState(readPure),[pureError,setPureError]=useState(""),[pureComparing,setPureComparing]=useState(false);
  const pureRef=useRef(pure),pureGraphRef=useRef(null),pureRequestRef=useRef(0);
  const pureRemote=audioOutput.state.remoteState==="connected";
  const pureRemoteRef=useRef(pureRemote);pureRemoteRef.current=pureRemote;
  useEffect(()=>{pureRef.current=pure;pureGraphRef.current?.apply(pureRemote||pureComparing?{...pure,enabled:false}:pure,false,pureComparing&&!pureRemote);try{localStorage.setItem("public:player_pure",JSON.stringify(pure));}catch{}},[pure,pureRemote,pureComparing]);
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
  const handleTimeRef = useRef((/** @type {HTMLAudioElement} */ _audio) => {});
  const handleEndedRef = useRef(() => {});

  // --- Stem mixer (EQ-based mixing via Web Audio BiquadFilters) ---
  const filterRefs = {
    bass: useRef(null),
    beat: [useRef(null), useRef(null), useRef(null)],
    vocals: [useRef(null), useRef(null), useRef(null)],
    treble: useRef(null),
  };
  const [mixer, setMixerState] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("public:player_mixer"));
      return normalizeMixer(saved);
    } catch {}
    return {...DEFAULT_MIXER};
  });
  const mixerRef = useRef(mixer);
  useEffect(() => {
    mixerRef.current = mixer;
    try { localStorage.setItem("public:player_mixer", JSON.stringify(mixer)); } catch {}
  }, [mixer]);

  const activeEl = () => els()[activeIdxRef.current];
  const inactiveIdx = () => (activeIdxRef.current === 0 ? 1 : 0);
  const inactiveEl = () => els()[inactiveIdx()];

  const retryRef=useRef(new Map());
  const preloadVersionRef=useRef(0),transitionVersionRef=useRef(0);
  const countedRef = useRef(new Set());
  const playAttemptRef=useRef(new Map());
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
  const volumeRef=useRef(volume);volumeRef.current=volume;
  const applyVolume=useCallback(value=>{
    const gain=volumeGainRef.current,ctx=audioCtxRef.current;
    els().forEach(audio=>{if(audio)audio.volume=gain?1:value;});
    if(gain&&ctx){gain.gain.cancelScheduledValues(ctx.currentTime);if(value===0)gain.gain.setValueAtTime(0,ctx.currentTime);else gain.gain.setTargetAtTime(value,ctx.currentTime,.015);}
  },[]);
  const [muted, setMutedState] = useState(() => {
    try {
      return localStorage.getItem("public:player_muted") === "true";
    } catch {
      return false;
    }
  });
  const [repeat, setRepeat] = useState("off"); // off | all | one
  const [shuffle, setShuffle] = useState(false);
  const shuffleRef=useRef(false);
  useEffect(()=>{shuffleRef.current=shuffle;preloadedTargetRef.current=null;},[shuffle]);
  // True when the user explicitly dismissed the player (clearQueue / drag-down).
  // Prevents ResumePlaybackBanner from auto-resuming a remote track right after
  // the user cleared the queue — "I don't want to listen" ≠ "I'm idle".
  const [dismissed, setDismissed] = useState(false);
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

  // Apply mixer settings to the filter nodes in the Web Audio graph.
  // Called after creating the graph and whenever a slider moves.
  const applyMixerToGraph = useCallback((m) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const set = (ref, val) => {
      if (ref.current) {
        const t = ctx.currentTime;
        smoothAudioParam(ref.current.gain,m.enabled ? val : 0,t);
      }
    };
    set(filterRefs.bass, m.bass);
    filterRefs.beat.forEach((ref,i) => set(ref, i===0 ? m.beat : 0));
    filterRefs.vocals.forEach((ref,i) => set(ref, i===0 ? m.vocals : 0));
    set(filterRefs.treble, m.treble);
    // Volume boost: master gain can exceed 1.0 for louder-than-max playback
    if (masterGainRef.current) {
      const t = ctx.currentTime;
      smoothAudioParam(masterGainRef.current.gain,mixerHeadroom(m),t);
    }
  }, []);

  // --- Web Audio graph (created once, on first play) ---
  const ensureGraph = useCallback(() => {
    configurePlaybackSession();
    if (audioCtxRef.current) return audioCtxRef.current;
    const failPure=()=>{if(pureRef.current.enabled){const off={...pureRef.current,enabled:false};pureRef.current=off;setPureState(off);setPureError("PURE could not start in this browser. Tap the switch to try again.");}};
    try {
      const AC = window.AudioContext || Reflect.get(window,"webkitAudioContext");
      if (!AC){failPure();return null;}
      const ctx = new AC();
      let pureGraph;
      try{pureGraph=createPureGraph(ctx);}catch(error){ctx.close().catch(()=>{});throw error;}
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      const master = ctx.createGain();
      master.gain.value = 1;
      const volumeGain=ctx.createGain();volumeGain.gain.value=volumeRef.current;
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
      // Stem mixer filter chain: analyser -> bass -> vocals -> treble -> master -> destination
      const bassF = ctx.createBiquadFilter();
      bassF.type = "lowshelf";
      bassF.frequency.value = 120;
      // Low mids and presence use one filter each, avoiding stacked boosts.
      const beatF1 = ctx.createBiquadFilter();
      beatF1.type = "peaking";
      beatF1.frequency.value = 400;
      beatF1.Q.value = 0.8;
      const beatF2 = ctx.createBiquadFilter();
      beatF2.type = "peaking";
      beatF2.frequency.value = 150;
      beatF2.Q.value = 0.4;
      const beatF3 = ctx.createBiquadFilter();
      beatF3.type = "peaking";
      beatF3.frequency.value = 2500;
      beatF3.Q.value = 0.4;
      const vocalsF1 = ctx.createBiquadFilter();
      vocalsF1.type = "peaking";
      vocalsF1.frequency.value = 2000;
      vocalsF1.Q.value = 0.8;
      const vocalsF2 = ctx.createBiquadFilter();
      vocalsF2.type = "peaking";
      vocalsF2.frequency.value = 1500;
      vocalsF2.Q.value = 0.7;
      const vocalsF3 = ctx.createBiquadFilter();
      vocalsF3.type = "peaking";
      vocalsF3.frequency.value = 3500;
      vocalsF3.Q.value = 0.8;
      const trebleF = ctx.createBiquadFilter();
      trebleF.type = "highshelf";
      trebleF.frequency.value = 8000;
      analyser.connect(bassF);
      bassF.connect(beatF1);
      beatF1.connect(vocalsF1);
      vocalsF1.connect(trebleF);
      trebleF.connect(master);
      filterRefs.bass.current = bassF;
      filterRefs.beat[0].current = beatF1;
      filterRefs.beat[1].current = beatF2;
      filterRefs.beat[2].current = beatF3;
      filterRefs.vocals[0].current = vocalsF1;
      filterRefs.vocals[1].current = vocalsF2;
      filterRefs.vocals[2].current = vocalsF3;
      filterRefs.treble.current = trebleF;
      pureGraphRef.current=pureGraph;
      pureGraph.apply(pureRemoteRef.current?{...pureRef.current,enabled:false}:pureRef.current,true);
      master.connect(pureGraph.input);pureGraph.output.connect(volumeGain);volumeGain.connect(ctx.destination);
      // Apply any mixer settings the user already chose to the new filters
      audioCtxRef.current = ctx;
      audioOutput.controller.attachGraph(ctx);
      analyserRef.current = analyser;
      masterGainRef.current = master;
      volumeGainRef.current=volumeGain;
      els().forEach(audio=>{if(audio)audio.volume=1;});
      applyMixerToGraph(mixerRef.current);
      return ctx;
    } catch {
      failPure();return null;
    }
  }, [applyMixerToGraph]);

  // Web Audio is only needed for blending transitions (crossfade/AutoMix/
  // gapless) or the Color Pulse visualizer. When it's NOT needed we leave the
  // <audio> elements un-routed and play them natively — this is the workaround
  // for iOS backgrounding: a routed (MediaElementSource) element goes silent a
  // few seconds after the app is backgrounded because iOS suspends the
  // AudioContext, while a plain media element keeps playing on an installed
  // (Home-Screen) PWA. Transitions/visualizer opt back in via ensureGraph().
  const graphNeeded = useCallback(() => {
    const s = getTransitionSettings();
    if(pureRef.current.enabled&&!pureRemoteRef.current)return true;
    if (isTransitionActive(s)||(isIOSDevice()&&volumeRef.current<1)) return true;
    // Mixer active (non-neutral) also needs the Web Audio graph
    const m = mixerRef.current;
    return m.enabled && (m.bass !== 0 || m.beat !== 0 || m.vocals !== 0 || m.treble !== 0 || m.boost !== 1);
  }, []);

  const getAnalyser = useCallback(() => analyserRef.current, []);

  const enableAnalyser = useCallback(() => {
    const ctx = ensureGraph();
    if (ctx && (ctx.state === "suspended" || ctx.state === "interrupted")) ctx.resume().catch(() => {});
    return !!analyserRef.current;
  }, [ensureGraph]);

  // Force the Web Audio graph so the mixer filters exist and audio is routed
  // through them. Called when the mixer panel opens.
  const enableMixer = useCallback(() => {
    const ctx = ensureGraph();
    if (ctx && (ctx.state === "suspended" || ctx.state === "interrupted")) ctx.resume().catch(() => {});
    return !!filterRefs.bass.current;
  }, [ensureGraph]);

  const setMixerValues = useCallback((values) => {
    if (!audioCtxRef.current) ensureGraph();
    const ctx=audioCtxRef.current;
    if (ctx?.state==="suspended") ctx.resume().catch(()=>{});
    const next=normalizeMixer({...mixerRef.current,...values});
    mixerRef.current=next;
    applyMixerToGraph(next);
    setMixerState(next);
  },[applyMixerToGraph,ensureGraph]);
  const setMixerValue=useCallback((key,value)=>{
    if(!(key in DEFAULT_MIXER))return;
    setMixerValues({[key]:value});
  },[setMixerValues]);
  const resetMixer=useCallback(()=>setMixerValues({...DEFAULT_MIXER}),[setMixerValues]);

  useEffect(()=>{if(!isPlaying||!pure.enabled||pureComparing||pureRemote)return;const timer=setInterval(()=>pureGraphRef.current?.measure(),200);return()=>clearInterval(timer);},[isPlaying,pure.enabled,pureComparing,pureRemote]);
  const comparePure=useCallback(value=>setPureComparing(value===true&&pureRef.current.enabled&&!pureRemoteRef.current),[]);
  const setPureValues=useCallback(async values=>{
    const next=normalizePure({...pureRef.current,...values}),request=++pureRequestRef.current;
    setPureError("");
    if(next.enabled&&pureRemoteRef.current){setPureError("Switch playback to this device to use PURE.");return false;}
    // Saving a preference while idle must not depend on autoplay permission.
    // Both play/resume paths already initialize graphNeeded() from pureRef.
    if(!next.enabled||!isPlayingRef.current){
      pureRef.current=next;
      if(audioCtxRef.current?.state!=="closed")pureGraphRef.current?.apply(next);
      setPureState(next);return true;
    }
    const ctx=ensureGraph();
    if(next.enabled&&(!ctx||ctx.state==="closed"||!pureGraphRef.current)){setPureError("Audio processing could not start. Try again.");return false;}
    pureRef.current=next;pureGraphRef.current?.apply(next);setPureState(next);
    if(next.enabled&&(ctx.state==="suspended"||ctx.state==="interrupted")){
      try{await ctx.resume();if(ctx.state!=="running")throw Error("Audio engine not running");}
      catch{if(request===pureRequestRef.current){const off={...next,enabled:false};pureRef.current=off;pureGraphRef.current?.apply(off);setPureState(off);setPureError("Audio processing paused. Tap PURE to try again.");}return false;}
    }
    return true;
  },[ensureGraph]);
  useEffect(()=>{
    const reset=()=>{setPureComparing(false);pureRequestRef.current++;const off={...DEFAULT_PURE};pureRef.current=off;pureGraphRef.current?.apply(off);setPureState(off);setPureError("");};
    window.addEventListener("account:cleared",reset);return()=>window.removeEventListener("account:cleared",reset);
  },[]);
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
  const resolveUrl = useCallback(async (track, side, valid=/** @type {()=>boolean} */ (()=>true)) => {
    if(blockedRef.current.has(track.uploader_id))throw Error('This uploader is blocked.');
    let url=track.audio_url,blobUrl=null;
    try{const rec=await getRecord(track.id,offlineAccountRef.current||null);if(rec?._blob)blobUrl=URL.createObjectURL(rec._blob);}catch{}
    if(!blobUrl && navigator.onLine && (track._private_audio || !url)){
      const fresh=await base44.entities.Track.get(track.id);url=fresh.audio_url;
    }
    if(!valid()||blockedRef.current.has(track.uploader_id)){if(blobUrl)URL.revokeObjectURL(blobUrl);throw Error("Playback request was replaced");}
    if(!blobUrl && (!url || typeof url!=="string"))throw Error("No playable audio source is available.");
    sideLoadedIdRef[side].current=track.id;
    if (blobUrlRefs[side].current && blobUrlRefs[side].current !== blobUrl) {
      URL.revokeObjectURL(blobUrlRefs[side].current);
    }
    blobUrlRefs[side].current = blobUrl || null;
    return blobUrl || url;
  }, []);

  const mirrorPlayback = useCallback(
    (el) => {
      if (!el) return;
      el.volume = volumeGainRef.current?1:volume;
      el.muted = muted;
      el.playbackRate = playbackRate;
    },
    [volume, muted, playbackRate]
  );

  // Abort any crossfade in progress: silence the tail element, restore active.
  const cancelCrossfade = useCallback(() => {
    preloadVersionRef.current++;transitionVersionRef.current++;
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
      let url;try{url = await resolveUrl(track, side,()=>token===loadTokenRef.current&&side===activeIdxRef.current);}catch{if(token!==loadTokenRef.current||side!==activeIdxRef.current)return;setIsPlaying(false);window.dispatchEvent(new CustomEvent("player:error",{detail:"This track is unavailable. Check your connection or sign in again."}));return;}
      if (token !== loadTokenRef.current) return; // a newer load superseded us
      mirrorPlayback(el);
      el.src = url;
      el.load();
      setPosition(0);
      setDuration(0);
      if (graphNeeded()) ensureGraph();
      const ctx = audioCtxRef.current;
      if (ctx && (ctx.state === "suspended" || ctx.state === "interrupted")) ctx.resume().catch(() => {});
      setGainImmediate(side, 1);
      const shouldPlay = autoPlayOnLoadRef.current;
      autoPlayOnLoadRef.current = true;
      if (shouldPlay) {
        configurePlaybackSession();
        if(ctx&&(ctx.state==="suspended"||ctx.state==="interrupted")){
          try{await ctx.resume();}catch{}
          if(token!==loadTokenRef.current)return;
        }
        el
          .play()
          .then(() => {if(token===loadTokenRef.current&&side===activeIdxRef.current)setIsPlaying(true);})
          .catch(() => {if(token===loadTokenRef.current&&side===activeIdxRef.current)setIsPlaying(false);});
      } else {
        setIsPlaying(false);
      }
    },
    [resolveUrl, mirrorPlayback, ensureGraph, setGainImmediate, cancelCrossfade, graphNeeded]
  );

  // Preload the next track onto the inactive element (no playback yet).
  const preloadSide = useCallback(async targetIndex=>{
    const side=inactiveIdx(),el=els()[side],track=queueRef.current[targetIndex];
    if(!el||!track||crossfadingRef.current)return;
    const token=++preloadVersionRef.current;
    sideReadyRef[side].current=false;
    if(readyListenerRef[side].current){el.removeEventListener('canplay',readyListenerRef[side].current);readyListenerRef[side].current=null;}
    try{
      const url=await resolveUrl(track,side,()=>token===preloadVersionRef.current&&side===inactiveIdx());
      if(token!==preloadVersionRef.current||side!==inactiveIdx()||queueRef.current[targetIndex]?.id!==track.id)return;
      mirrorPlayback(el);el.src=url;sideLoadedIdRef[side].current=track.id;
      const ready=()=>{if(token===preloadVersionRef.current&&sideLoadedIdRef[side].current===track.id){sideReadyRef[side].current=true;readyListenerRef[side].current=null;}};
      readyListenerRef[side].current=ready;el.addEventListener('canplay',ready,{once:true});el.load();
      if(el.readyState>=3){el.removeEventListener('canplay',ready);ready();}
    }catch{if(token===preloadVersionRef.current){sideReadyRef[side].current=false;sideLoadedIdRef[side].current=null;preloadedTargetRef.current=null;}}
  },[resolveUrl,mirrorPlayback]);

  // Compute the upcoming track index and pre-buffer it on the inactive element
  // (unless it's already loaded+ready). Used right after a track loads AND after
  // a crossfade completes, so the next transition always has a ready source.
  const preloadNextTrack = useCallback(() => {
    const ci = currentIndexRef.current;
    const q = queueRef.current;
    if (ci < 0 || !q.length) return;
    let n = -1;
    if(shuffleRef.current && q.length>1){do{n=Math.floor(Math.random()*q.length);}while(n===ci);}
    else if (ci + 1 < q.length) n = ci + 1;
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
  const beginCrossfade = useCallback(async(targetIndex,cf,remaining)=>{
    if(crossfadingRef.current)return false;
    const oldSide=activeIdxRef.current,side=inactiveIdx(),el=els()[side],track=queueRef.current[targetIndex];
    if(!el||!track)return false;
    if(sideLoadedIdRef[side].current!==track.id||!sideReadyRef[side].current){preloadedTargetRef.current=targetIndex;preloadSide(targetIndex);return false;}
    const token=++transitionVersionRef.current,valid=()=>token===transitionVersionRef.current&&activeIdxRef.current===oldSide&&queueRef.current[targetIndex]?.id===track.id;
    const ctx=ensureGraph();if(!ctx)return false;
    crossfadingRef.current=true;
    try{if(ctx.state==='suspended')await ctx.resume();}catch{if(valid())crossfadingRef.current=false;return false;}
    if(!valid())return false;
    const fd=transitionDuration(cf,remaining,el.duration,activeEl()?.playbackRate||1);
    if(!fd){crossfadingRef.current=false;return false;}
    setGainImmediate(side,0);mirrorPlayback(el);
    const ok=await commitAudioHandoff(el,valid,()=>{
      rampGainEqualPower(side,true,fd);rampGainEqualPower(oldSide,false,fd);
      activeIdxRef.current=side;sideReadyRef[side].current=false;preloadedTargetRef.current=null;
      setCurrentIndex(targetIndex);setPosition(el.currentTime||0);setDuration(el.duration||0);setIsPlaying(true);
      if(crossfadeTimerRef.current)clearTimeout(crossfadeTimerRef.current);
      crossfadeTimerRef.current=setTimeout(()=>{
        if(token!==transitionVersionRef.current)return;
        els()[oldSide]?.pause();setGainImmediate(oldSide,0);setGainImmediate(side,1);
        crossfadingRef.current=false;preloadNextTrack();
      },fd*1000);
    });
    if(!ok&&valid()){el.pause();crossfadingRef.current=false;setGainImmediate(side,0);setGainImmediate(oldSide,1);sideReadyRef[side].current=false;if(els()[oldSide]?.ended)handleEndedRef.current();}
    return ok;
  },[ensureGraph,preloadSide,mirrorPlayback,setGainImmediate,rampGainEqualPower,preloadNextTrack]);

  const beginGapless = useCallback(async targetIndex=>{
    if(crossfadingRef.current)return false;
    const oldSide=activeIdxRef.current,side=inactiveIdx(),el=els()[side],track=queueRef.current[targetIndex];
    if(!el||!track||sideLoadedIdRef[side].current!==track.id||!sideReadyRef[side].current)return false;
    const token=++transitionVersionRef.current,valid=()=>token===transitionVersionRef.current&&activeIdxRef.current===oldSide&&queueRef.current[targetIndex]?.id===track.id;
    crossfadingRef.current=true;
    try{el.currentTime=0;const ctx=audioCtxRef.current;if(ctx?.state==='suspended')await ctx.resume();}catch{if(valid())crossfadingRef.current=false;return false;}
    mirrorPlayback(el);setGainImmediate(side,1);
    const ok=await commitAudioHandoff(el,valid,()=>{
      els()[oldSide]?.pause();setGainImmediate(oldSide,0);activeIdxRef.current=side;
      sideReadyRef[side].current=false;preloadedTargetRef.current=null;setCurrentIndex(targetIndex);
      setPosition(el.currentTime||0);setDuration(el.duration||0);setIsPlaying(true);
      crossfadeTimerRef.current=setTimeout(()=>{if(token!==transitionVersionRef.current)return;crossfadingRef.current=false;preloadNextTrack();},100);
    });
    if(!ok&&valid()){el.pause();crossfadingRef.current=false;setGainImmediate(side,0);setGainImmediate(oldSide,1);}
    return ok;
  },[mirrorPlayback,setGainImmediate,preloadNextTrack]);

  useEffect(()=>{
    const change=()=>{cancelCrossfade();if(graphNeeded()){const ctx=ensureGraph();if(ctx?.state==='suspended')ctx.resume().catch(()=>{});}preloadNextTrack();};
    window.addEventListener('transitions:change',change);
    return()=>window.removeEventListener('transitions:change',change);
  },[cancelCrossfade,ensureGraph,graphNeeded,preloadNextTrack]);

  // --- per-track load: crossfade engine handles natural advances, manual
  // changes load on the active element. ---
  useEffect(() => {
    const track = currentTrack;
    if (!track) {
      loadTokenRef.current++;
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
  }, [currentTrack?.id,currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preload the upcoming track on the inactive element as soon as the current
  // track starts, so a crossfade has a buffered source ready WELL before the
  // transition point (instead of only cf+3s before the end, which often misses).
  // While a crossfade is in flight the inactive element is still playing the
  // outgoing tail — don't overwrite its src (that would cut the fade short).
  // The crossfade timer calls preloadNextTrack() once the blend completes.
  useEffect(() => {
    if (crossfadingRef.current) return;
    preloadNextTrack();
  }, [currentTrack?.id,shuffle,queue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Report playback position/duration to the OS Media Session. iOS uses this
  // (together with the now-playing metadata + action handlers) to recognize a
  // "controllable" media session — which is what lets a standalone (Home-Screen)
  // PWA keep Web-Audio-routed audio alive in the background / on the lock screen.
  const syncPositionState = useCallback((a) => {
    if (!a || !("mediaSession" in navigator)) return;
    try{navigator.mediaSession.playbackState=a.paused?"paused":"playing";}catch{}
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
          configurePlaybackSession();
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
        if (a === activeEl()) {countedRef.current.delete(queueRef.current[currentIndexRef.current]?.id);handleEndedRef.current();}
      };
      const onError=async()=>{
        if(a!==activeEl())return;
        const track=queueRef.current[currentIndexRef.current],side=activeIdxRef.current,token=loadTokenRef.current;
        if(track && Date.now()-(retryRef.current.get(track.id)||0)>60000){
          retryRef.current.set(track.id,Date.now());
          const at=a.currentTime||position;let url=null,retryBlob=null;
          const valid=()=>token===loadTokenRef.current&&side===activeIdxRef.current&&queueRef.current[currentIndexRef.current]?.id===track.id&&!blockedRef.current.has(track.uploader_id);
          try{if(navigator.onLine&&track._private_audio)url=(await base44.entities.Track.get(track.id)).audio_url;
            else{const rec=await getRecord(track.id,offlineAccountRef.current||null);if(rec?._blob){retryBlob=URL.createObjectURL(rec._blob);url=retryBlob;}}
          }catch{}
          if(!valid()){if(retryBlob)URL.revokeObjectURL(retryBlob);return;}
          if(url){
            const previous=blobUrlRefs[side].current;
            if(previous&&previous!==retryBlob)URL.revokeObjectURL(previous);
            blobUrlRefs[side].current=retryBlob;
            pendingSeekRef.current={id:track.id,at};a.src=url;a.load();
            a.play().catch(()=>{if(valid())setIsPlaying(false);});return;
          }
        }
        if(token!==loadTokenRef.current||side!==activeIdxRef.current)return;
        setIsPlaying(false);window.dispatchEvent(new CustomEvent('player:error',{detail:'This track could not load. Check your connection or choose another song.'}));
      };
      a.addEventListener('error',onError);
      a.addEventListener("timeupdate", onTime);
      a.addEventListener("durationchange", onDur);
      a.addEventListener("loadedmetadata", onDur);
      a.addEventListener("play", onPlay);
      a.addEventListener("pause", onPause);
      a.addEventListener("ended", onEnded);
      return () => {
        a.removeEventListener('error',onError);
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

  useEffect(()=>{const t=queueRef.current[currentIndexRef.current];if(t&&blocked.has(t.uploader_id)){loadTokenRef.current++;cancelCrossfade();els().forEach(a=>a?.pause());setIsPlaying(false);window.dispatchEvent(new CustomEvent('player:error',{detail:'Playback stopped because this uploader is blocked.'}));}},[blocked,cancelCrossfade]);

  // timeupdate logic (reads latest via ref)
  useEffect(() => {
    handleTimeRef.current = (a) => {
      const cur = a.currentTime || 0;
      sampleListening(offlineAccountRef.current,queueRef.current[currentIndexRef.current],cur,!a.paused);
      setPosition(cur);
      syncPositionState(a);
      const s = getTransitionSettings();
      const gapless = isGapless(s);
      if(a.paused || a.ended || (!isTransitionActive(s) && !gapless) || crossfadingRef.current) return;
      const d = a.duration;
      if (!d || !isFinite(d)) return;
      const remaining = d - cur;
      if (remaining <= 0) return;
      const qi = queueRef.current;
      const ci = currentIndexRef.current;
      let n = -1;
      if (repeatRef.current !== "one") {
        if(shuffleRef.current && qi.length>1) n=preloadedTargetRef.current;
        else if (ci + 1 < qi.length) n = ci + 1;
        else if (repeatRef.current === "all" && qi.length) n = 0;
      }
      if (n == null || n === -1) return; // queue ends here — let the ended handler auto-radio
      if (gapless) {
        const side = inactiveIdx();
        if (remaining <= 6 && sideLoadedIdRef[side].current !== qi[n].id) {
          preloadedTargetRef.current = n;
          preloadSide(n);
        }
        // Hand off on ended, preserving the complete outgoing tail.
        return;
      }
      // AutoMix: short, snappy mix (1.5s) so the song plays almost fully before
      // transitioning — the long user crossfade duration drags songs out.
      const isAutoMix = s.mode === TRANSITION_MODES.AUTOMIX;
      const cf = isAutoMix ? 1.5 : s.crossfadeSeconds;
      // Preload a little early so the crossfade can start on time.
      if (remaining <= cf + 3 && remaining > cf && preloadedTargetRef.current !== n) {
        preloadedTargetRef.current = n;
        preloadSide(n);
      }
      if (remaining/(a.playbackRate||1) <= cf && remaining > 0) beginCrossfade(n, cf, remaining);
    };
  }, [preloadSide, beginCrossfade, beginGapless]);

  // continued play counting
  const countPlay = useCallback((track) => {
    if (!track || countedRef.current.has(track.id)||Date.now()-(playAttemptRef.current.get(track.id)||0)<60000) return;
    playAttemptRef.current.set(track.id,Date.now());
    countedRef.current.add(track.id);
    base44.functions.invoke("registerPlay", { track_id: track.id }).catch(() => {countedRef.current.delete(track.id);});
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
        _private_audio:!!track._private_audio,
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
    if (isPlaying && currentTrack && position>=Math.min(30, Math.max(5,duration/2))) countPlay(currentTrack);
  }, [isPlaying, currentTrack?.id,position,duration,countPlay]);

  const nextIndex = useCallback(() => {
    if (!queue.length) return -1;
    if (shuffle && queue.length > 1) {
      const prepared=preloadedTargetRef.current;if(Number.isInteger(prepared)&&prepared!==currentIndex&&prepared>=0&&prepared<queue.length)return prepared;
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
    const token=loadTokenRef.current,owner=offlineAccountRef.current;
    const valid=()=>token===loadTokenRef.current&&owner===offlineAccountRef.current;
    try {
      const userGenres = await getUserGenres().catch(() => []);
      if(!valid())return false;
      const picks = await buildAutoQueue(
        track,
        queueRef.current.map((t) => t.id),
        15,
        userGenres
      );
      if (!valid() || !picks.length) return false;
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
      const recs = await listRecords(offlineAccountRef.current||null);
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
        _private_audio:!!r._private_audio,
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
    const token=loadTokenRef.current,owner=offlineAccountRef.current;
    const tracks = await getOfflineQueue();
    if(token!==loadTokenRef.current||owner!==offlineAccountRef.current)return;
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
    if(tracks[nextIdx]?.id===curId)loadOnActive(tracks[nextIdx]);
  }, [getOfflineQueue, currentTrack,loadOnActive]);

  // ended handler (only the active element, only when not crossfading)
  useEffect(() => {
    handleEndedRef.current = async () => {
      if (crossfadingRef.current) return;
      const token=loadTokenRef.current;
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
        if(isGapless(getTransitionSettings())){const switched=await beginGapless(n);if(token!==loadTokenRef.current||switched)return;}
        autoPlayOnLoadRef.current=true;setCurrentIndex(n);
        return;
      }
      if (repeat === "off" && currentTrack) {
        const ok = await extendWithGenreRadio(currentTrack);
        if (token!==loadTokenRef.current||ok) return;
      }
      setIsPlaying(false);
    };
  }, [repeat, nextIndex, currentTrack, extendWithGenreRadio, advanceOffline,beginGapless]);

  // volume / mute / rate apply to both elements
  useEffect(() => {
    applyVolume(volume);
  }, [volume,applyVolume]);
  useEffect(() => {
    els().forEach((a) => a && (a.muted = muted));
  }, [muted]);
  useEffect(() => {
    els().forEach((a) => a && (a.playbackRate = playbackRate));
  }, [playbackRate]);

  const playTrackAt = useCallback((tracks, index = 0) => {
    if (!tracks || !tracks.length) return;
    loadTokenRef.current++;
    countedRef.current = new Set();
    setDismissed(false);
    setQueue(tracks);
    const target=Math.max(0,Math.min(tracks.length-1,index));
    setCurrentIndex(target);
    if(currentTrack?.id===tracks[target]?.id)loadOnActive(tracks[target]);
  }, [currentTrack?.id,loadOnActive]);

  // Hand off playback from another device: load the track and seek to where
  // that device left off, as soon as the media reports it's seekable.
  const resumeTrack = useCallback((track, atSeconds = 0, autoplay = true) => {
    if (!track) return;
    loadTokenRef.current++;
    pendingSeekRef.current = { id: track.id, at: Math.max(0, atSeconds) };
    autoPlayOnLoadRef.current = autoplay;
    countedRef.current = new Set();
    setDismissed(false);
    setQueue([track]);
    setCurrentIndex(0);
    if (currentTrack?.id === track.id) loadOnActive(track);
  }, [currentTrack?.id, loadOnActive]);

  // Play the active element, resuming a suspended AudioContext FIRST. WebKit
  // auto-suspends the AudioContext while audio is paused; if we call play()
  // before the context resumes, the element advances but the routed graph is
  // silent — the "volume disappears after pause" bug. await resume, then play.
  const resumeAndPlay = useCallback(
    (a) => {
      configurePlaybackSession();
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
            // Only on iOS (the bug is WebKit-specific); on other browsers the
            // nudge is an audible backward skip that sounds like a stutter.
            const isIOS =
              typeof navigator !== "undefined" &&
              (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
            if (isIOS && audioCtxRef.current && isFinite(a.currentTime)) {
              try {
                a.currentTime = Math.max(0, a.currentTime - 0.05);
              } catch {}
            }
          })
          .catch(() => {});
      };
      if (ctx && (ctx.state === "suspended" || ctx.state === "interrupted")) {
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
      cancelCrossfade();els().forEach(el=>el?.pause());
      setIsPlaying(false);
    }
  }, [currentTrack, ensureGraph, graphNeeded, resumeAndPlay,cancelCrossfade]);

  const seek=useCallback(value=>{
    const time=Number(value);if(!Number.isFinite(time))return;
    cancelCrossfade();
    const a=activeEl();if(!a)return;
    const track=queueRef.current[currentIndexRef.current];
    const known=Number.isFinite(a.duration)&&a.duration>0?a.duration:Number(track?.duration_seconds)||0;
    const target=Math.max(0,known>0?Math.min(time,known):time);
    try{a.currentTime=target;}catch{
      if(track?.id)pendingSeekRef.current={id:track.id,at:target};
      return;
    }
    setPosition(target);syncPositionState(a);
  },[cancelCrossfade,syncPositionState]);

  const setMuted = useCallback((m) => {
    setMutedState(m);
    try {
      localStorage.setItem("public:player_muted", String(m));
    } catch {}
  }, [cancelCrossfade]);

  const prepareVolumeControl=useCallback(()=>{
    if(!isIOSDevice())return;
    // A tap at full volume should leave native background playback available.
    if(!audioCtxRef.current&&volumeRef.current>=1)return;
    const ctx=ensureGraph();
    if(ctx&&ctx.state!=="running")ctx.resume().catch(()=>{});
  },[ensureGraph]);
  const setVolume = useCallback((input) => {
    const value=Number(input);if(!Number.isFinite(value))return;
    const v=Math.max(0,Math.min(1,value));
    volumeRef.current=v;
    prepareVolumeControl();
    applyVolume(v);
    setVolumeState(v);
    try {localStorage.setItem("public:player_volume",String(v));} catch {}
    if(v>0)setMuted(false);
  },[setMuted,prepareVolumeControl,applyVolume]);

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
      if (isTransitionActive(s) && ready && !activeEl()?.paused) {
        const a = activeEl();
        const remaining =
          a && a.duration && isFinite(a.duration)
            ? a.duration - (a.currentTime || 0)
            : s.crossfadeSeconds;
        const expected=currentIndexRef.current;
        beginCrossfade(targetIndex,s.mode===TRANSITION_MODES.AUTOMIX?1.5:s.crossfadeSeconds,remaining).then(ok=>{if(!ok&&currentIndexRef.current===expected&&!crossfadingRef.current)setCurrentIndex(targetIndex);});
      } else {
        autoPlayOnLoadRef.current=!!activeEl()&&!activeEl().paused;
        if(currentIndexRef.current===targetIndex)loadOnActive(target);else setCurrentIndex(targetIndex);
      }
    },
    [beginCrossfade,loadOnActive]
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
    cancelCrossfade();
    const a = activeEl();
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      setPosition(0);
      return;
    }
    if (currentIndex - 1 >= 0) setCurrentIndex(currentIndex - 1);
    else if (repeat === "all") setCurrentIndex(queue.length - 1);
  }, [currentIndex, queue.length, repeat,cancelCrossfade,currentTrack]);

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

  const skipBy=useCallback(delta=>{
    const value=Number(delta),a=activeEl();if(!a||!Number.isFinite(value))return;
    seek((a.currentTime||0)+value);
  },[seek]);

  const addToQueue = useCallback((track) => {
    setDismissed(false);
    setQueue((prev) => [...prev, track]);
  }, []);

  const addManyToQueue = useCallback((tracks) => {
    setDismissed(false);
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
        setDismissed(false);
        setCurrentIndex(index);
        countedRef.current = new Set();
      }
    },
    [queue.length]
  );

  const stopPlayback = useCallback(()=>{
    // Invalidate asynchronous loads before changing React state.
    loadTokenRef.current++;cancelCrossfade();queueRef.current=[];currentIndexRef.current=-1;
    pendingSeekRef.current=null;autoPlayOnLoadRef.current=true;
    for(const audio of els()){try{audio?.pause();audio?.removeAttribute("src");audio?.load();}catch{}}
    for(const ref of blobUrlRefs){if(ref.current)URL.revokeObjectURL(ref.current);ref.current=null;}
    for(const ref of sideLoadedIdRef)ref.current=null;
    for(const ref of sideReadyRef)ref.current=false;
    if(sleepTimerRef.current)clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current=null;
    setQueue([]);setCurrentIndex(-1);setIsPlaying(false);setPosition(0);setDuration(0);setDismissed(true);setSleepTimerEndsAt(null);
  },[cancelCrossfade]);

  useEffect(()=>{
    const clearSession=stopPlayback;
    window.addEventListener("account:cleared",clearSession);
    window.addEventListener("offlinecache:account",clearSession);
    return()=>{window.removeEventListener("account:cleared",clearSession);window.removeEventListener("offlinecache:account",clearSession);};
  },[stopPlayback]);

  const clearQueue = useCallback(() => {
    stopPlayback();
    // Clear playback state across ALL of the user's devices so the song
    // doesn't auto-resume on another device after the user dismissed it here.
    if (user?.id) {
      base44.entities.PlaybackState.updateMany(
        { user_id: user.id },
        { $set: { track_id: "", track: "", is_playing: false, position_seconds: 0, sampled_at: new Date().toISOString() } }
      ).catch(() => {});
    }
  }, [user?.id,stopPlayback]);

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
      loadTokenRef.current++;cancelCrossfade();
      els().forEach(el=>el?.pause());
      setIsPlaying(false);
      setSleepTimerEndsAt(null);
      sleepTimerRef.current = null;
    }, minutes * 60 * 1000);
  }, [cancelCrossfade]);

  // Dedicated resume / pause so the lock-screen "play" action always plays
  // (toggling on a "play" event could accidentally pause if iOS double-fires).
  const resumePlayback = useCallback(() => {
    const a = activeEl();
    if (!a || !currentTrack) return;
    // The page may have been frozen by the OS while backgrounded, leaving the
    // element with no source / nothing decoded. Reload the current track so
    // the lock-screen play button always produces sound instead of no-op.
    if (!a.src || a.readyState === 0) {
      return loadOnActive(currentTrack);
    }
    if (graphNeeded()) ensureGraph();
    return resumeAndPlay(a);
  }, [currentTrack, ensureGraph, graphNeeded, loadOnActive, resumeAndPlay]);

  const pausePlayback = useCallback(() => {
    const a = activeEl();
    if (!a) return;
    els().forEach(el=>el?.pause());
    setIsPlaying(false);
    try{navigator.mediaSession.playbackState="paused";}catch{}
    syncPositionState(a);
  }, [syncPositionState]);

  // iOS suspends the AudioContext when a standalone PWA is backgrounded /
  // the screen locks, which silences Web-Audio-routed playback. On return to
  // the foreground, re-arm the context and resume the track if it was playing.
  useEffect(() => {
    const onVis = () => {
      if(document.visibilityState!=="visible"||!isPlayingRef.current)return;
      configurePlaybackSession();
      const ctx=audioCtxRef.current;
      if(ctx&&(ctx.state==="suspended"||ctx.state==="interrupted"))ctx.resume().catch(()=>{});
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

  // Cached audio remains the active source when the connection changes.
  // Replacing its blob URL on every online event interrupts saved playback.

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
      try{const session=Reflect.get(navigator,"audioSession");if(session?.type==="playback")session.type="auto";}catch{}
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

  // Register once; every OS action reads the current controls rather than an
  // old track/queue closure while React is catching up in the background.
  const mediaControls=useRef(null);
  mediaControls.current={resumePlayback,pausePlayback,prev,next,seek,skipBy};
  useEffect(()=>{
    if(!("mediaSession" in navigator))return;
    const invoke=(name,...args)=>{try{const result=mediaControls.current?.[name]?.(...args);result?.catch?.(()=>{});}catch{}};
    const offset=details=>Number.isFinite(details?.seekOffset)&&details.seekOffset>0?details.seekOffset:10;
    const actions={
      play:()=>invoke("resumePlayback"),pause:()=>invoke("pausePlayback"),
      previoustrack:()=>invoke("prev"),nexttrack:()=>invoke("next"),
      seekto:details=>{if(Number.isFinite(details?.seekTime))invoke("seek",details.seekTime);},
      seekbackward:details=>invoke("skipBy",-offset(details)),
      seekforward:details=>invoke("skipBy",offset(details)),
      stop:()=>{invoke("pausePlayback");invoke("seek",0);},
    };
    for(const [action,handler] of Object.entries(actions)){try{navigator.mediaSession.setActionHandler(action,handler);}catch{}}
    return()=>{for(const action of Object.keys(actions)){try{navigator.mediaSession.setActionHandler(action,null);}catch{}}};
  },[]);

  useEffect(()=>()=>{els().forEach(a=>a?.pause());if(crossfadeTimerRef.current)clearTimeout(crossfadeTimerRef.current);if(sleepTimerRef.current)clearTimeout(sleepTimerRef.current);audioCtxRef.current?.close().catch(()=>{});},[]);

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
    pausePlayback,
    seek,
    setVolume,
    prepareVolumeControl,
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
    mixer,
    setMixerValues,
    setMixerValue,
    resetMixer,
    enableMixer,
    dismissed,
    audioOutput,
    pure,pureError,setPureValues,pureComparing,comparePure,pureSuspended:pureRemote,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}