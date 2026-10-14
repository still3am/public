import {copyText} from '@/lib/shareLink';
import { useState, useRef, useEffect, useCallback } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { useColorPalette } from "@/hooks/useColorPalette";
import { useAuth } from "@/lib/AuthContext";
import { formatTime } from "@/lib/audio-utils";
import { shareTrack } from "@/lib/shareTrack";
import SyncedLyrics from "@/components/SyncedLyrics";
import TrackOptionsMenu from "@/components/track/TrackOptionsMenu";
import { ListMusic, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import {
  SkipBack,
  SkipForward,
  ChevronDown,
  Mic2,
  Volume2,
  VolumeX,
  Volume1,
  Repeat,
  Repeat1,
  Shuffle,
  Disc3,
  X } from
"lucide-react";
import PulseVisualizer from "@/components/PulseVisualizer";
import PlayPauseButton from "@/components/PlayPauseButton";
import QueuePanel from "@/components/QueuePanel";
import LoungeHostModal from "@/components/LoungeHostModal";
import StemMixer from "@/components/StemMixer";
import { useLoungeHost } from "@/hooks/useLoungeHost";
import { useLibrary } from "@/context/LibraryContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useOfflineCoverUrl } from "@/hooks/useOfflineCoverUrl";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

const clampVol = (v) => Math.max(0, Math.min(1, v));

/** @param {any} props */
function IconButton({ icon: Icon, onClick, active, size = 22, label, className = "" }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`p-2.5 rounded-full active:scale-90 hover:bg-white/10 transition ${
      active ? "opacity-100" : "opacity-50"} ${
      className}`}>
      
      <Icon size={size} />
    </button>);

}

/** @param {any} props */
export default function FullScreenPlayer({ onClose }) {
  const p = usePlayer();
  const { user } = useAuth();
  const { isInLibrary, toggle: toggleLibrary } = useLibrary();
  const offlineCover = useOfflineCoverUrl(p.currentTrack?.id, p.currentTrack?.cover_art_url);
  const coverUrl = useCoverUrl(offlineCover);
  const playerPalette = useColorPalette(coverUrl, true);
  const [ambientPrimary, ambientSecondary] = playerPalette;
  const [lyricsMode, setLyricsMode] = useState(false);
  // Automatic visual pulse does not force an AudioContext; it can use an existing analyser when available.
  const showPulse = true;
  const [showVolHint, setShowVolHint] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showLyricsPanel, setShowLyricsPanel] = useState(true);
  const t = p.currentTrack;
  const lounge = useLoungeHost();
  const cache = useOfflineCache();
  const { toast } = useToast();
  const [loungeOpen, setLoungeOpen] = useState(false);
  const [showMixer, setShowMixer] = useState(false);
  const volDrag = useRef({ startY: 0, start: 0, active: false });
  const hintTimer = useRef(null);
  const dismissDrag = useRef({ startY: 0, active: false, moved: false });
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dismissThreshold = 110;
  const [lyricsAvailability, setLyricsAvailability] = useState({ trackId: null, available: false });
  const hasLyrics = lyricsAvailability.trackId === t?.id && lyricsAvailability.available;
  const showingLyrics = lyricsMode && hasLyrics;
  const handleLyricsUnavailable = useCallback(() => {
    setLyricsMode(false);
    setLyricsAvailability(previous => previous.trackId === t?.id && !previous.available ? previous : { trackId: t?.id, available: false });
  }, [t?.id]);
  const [coverFailed, setCoverFailed] = useState(false);

  // Reset the broken-cover flag whenever the track (and thus its cover URL) changes.
  useEffect(() => { setCoverFailed(false); }, [coverUrl]);

  // Only show the Lyrics toggle when this track actually has lyrics available
  // (approved timed lyrics, or plain-text lyrics_text on the track).
  useEffect(() => {
    let alive = true;
    if (!t?.id) {
      setLyricsAvailability({ trackId: null, available: false });
      setLyricsMode(false);
      return;
    }
    setLyricsMode(false);
    const fallbackText = typeof t.lyrics_text === "string" ? t.lyrics_text.trim() : "";
    setLyricsAvailability({ trackId: t.id, available: !!fallbackText, record: null, text: fallbackText });
    Promise.all([
      base44.entities.Lyrics
        .filter({ track_id: t.id, status: "approved" }, "-created_date", 5)
        .catch(() => []),
      base44.entities.Track.get(t.id).catch(() => null),
    ]).then(([lyricsRes, track]) => {
      if (!alive) return;
      const found = Array.isArray(lyricsRes) ? lyricsRes.find(record => Array.isArray(record.lines) && record.lines.some(line => (line.text?.trim() || line.words?.some(word => word.text?.trim())) && (line.start_time_ms || line.end_time_ms))) : null;
      const lines = found?.lines || [];
      const hasTimed = lines.length && lines.some((l) => l.start_time_ms || l.end_time_ms);
      const text = typeof track?.lyrics_text === "string" ? track.lyrics_text.trim() : fallbackText;
      const available = !!hasTimed || !!text;
      setLyricsAvailability({ trackId: t.id, available, record: found, text });
      if (!available) setLyricsMode(false);
    });
    return () => { alive = false; };
  }, [t?.id]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target?.tagName === "INPUT" || e.target?.tagName === "TEXTAREA") return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          p.togglePlay();
          break;
        case "ArrowRight":
          if (e.shiftKey) p.next();else
          p.seek(Math.min((p.position || 0) + 5, p.duration || 0));
          break;
        case "ArrowLeft":
          if (e.shiftKey) p.prev();else
          p.seek(Math.max((p.position || 0) - 5, 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          p.setVolume(clampVol((p.muted ? 0 : p.volume) + 0.05));
          break;
        case "ArrowDown":
          e.preventDefault();
          p.setVolume(clampVol((p.muted ? 0 : p.volume) - 0.05));
          break;
        case "KeyM":
          p.setMuted(!p.muted);
          break;
        case "KeyL":
          if (hasLyrics) setLyricsMode((v) => !v);
          break;
        case "Escape":
          onClose();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p, onClose, hasLyrics]);

  // Lock the background page while the full-screen player is open so the drag-
  // to-dismiss gesture can't scroll / overscroll the Home feed behind it.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function flashHint() {
    setShowVolHint(true);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setShowVolHint(false), 1000);
  }

  useEffect(()=>()=>{clearTimeout(hintTimer.current);volDrag.current.active=false;},[]);
  const onVolPointerDown=event=>{
    if(event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0))return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    volDrag.current={pointerId:event.pointerId,startY:event.clientY,start:p.muted?0:p.volume,active:true};
    p.prepareVolumeControl?.();
    flashHint();
  };
  const onVolPointerMove=event=>{
    const drag=volDrag.current;
    if(!drag.active||drag.pointerId!==event.pointerId)return;
    event.stopPropagation();
    if(event.cancelable)event.preventDefault();
    const distance=Math.max(160,Math.min(320,event.currentTarget.getBoundingClientRect().height));
    p.setVolume(clampVol(drag.start+(drag.startY-event.clientY)/distance));
    flashHint();
  };
  const onVolPointerEnd=event=>{
    if(volDrag.current.pointerId!==event.pointerId)return;
    volDrag.current.active=false;
    p.prepareVolumeControl?.();
    if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    flashHint();
  };

  async function toggleOffline() {
    if (!t) return;
    if (cache.isCached(t.id)) {
      if(await cache.removeTrack(t.id))toast({ title: "Removed from offline music" });
      return;
    }
    const ok = await cache.downloadTrack(t);
    toast(
      ok
        ? { title: "Saved for offline" }
        : { title: "Couldn't save offline", variant: "destructive" }
    );
  }

  async function shareNow(copyOnly = false) {
    if (!t) return;
    try{
      const result=copyOnly?(await copyText(window.location.origin+'/track/'+encodeURIComponent(t.id)),'copied'):await shareTrack(t);
      if(result==='copied'){setCopied(true);setTimeout(()=>setCopied(false),1500);}
    }catch{/* Keep the player open and leave playback running. */}
  }

  if (!t) return null;
  const progress = p.duration ? p.position / p.duration * 100 : 0;
  const remaining = Math.max(0, (p.duration || 0) - (p.position || 0));
  const volPct = (p.muted ? 0 : p.volume) * 100;
  const repeatOff = p.repeat === "off";
  const isMutedLow = p.muted || p.volume === 0;
  const VolIcon = isMutedLow ? VolumeX : p.volume < 0.5 ? Volume1 : Volume2;

  return (
    <div role="dialog" aria-modal="true" aria-label="Now playing" data-public-dialog tabIndex={-1} onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();onClose?.();}}}
      className="fixed inset-0 z-50 text-white animate-[fadeIn_.25s_ease-out] flex flex-col overflow-hidden"
      style={{
        background: "#101116",
        transform: `translateY(${dragY}px)`,
        opacity: dragging ? 1 - Math.min(dragY / (window.innerHeight || 800), 0.45) : 1,
        transition: dragging ? "none" : "transform .32s cubic-bezier(.22,1,.36,1), opacity .28s ease-out"
      }}>
      
      {/* ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{ background: `radial-gradient(ellipse at 20% 5%, ${ambientPrimary} 0%, transparent 70%), radial-gradient(ellipse at 85% 60%, ${ambientSecondary} 0%, transparent 75%)` }} />

      {/* reactive visualizer */}
      {showPulse && <PulseVisualizer palette={playerPalette} className="absolute inset-0 z-0" />}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0" style={{ background: "linear-gradient(180deg, rgba(5,6,10,.14) 0%, rgba(5,6,10,.08) 38%, rgba(5,6,10,.48) 100%)" }} />
      

      {/* top bar */}
      <div
        onTouchStart={(e) => {
          const tch = e.touches[0];
          dismissDrag.current = { startY: tch.clientY, active: true, moved: false };
          setDragging(true);
        }}
        onTouchMove={(e) => {
          if (!dismissDrag.current.active) return;
          e.preventDefault();
          const dy = e.touches[0].clientY - dismissDrag.current.startY;
          if (dy > 0) setDragY(dy);
          if (dy > 10) dismissDrag.current.moved = true;
        }}
        onTouchEnd={() => {
          dismissDrag.current.active = false;
          setDragging(false);
          if (dragY >= dismissThreshold) {
            setDragY(window.innerHeight);
            setTimeout(onClose, 260);
          } else {
            setDragY(0);
          }
        }}
        className="relative flex items-center justify-between px-5 md:px-10 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-3 shrink-0 touch-none">
        <button onClick={onClose} className="p-2 -ml-2 active:scale-90 hover:bg-white/10 rounded-full transition" aria-label="Close">
          <ChevronDown size={26} />
        </button>
        <div className="flex-1 min-w-0 px-3">
          {showingLyrics && <div className="xl:hidden flex items-center gap-3 min-w-0">
            {coverUrl && !coverFailed && <img src={coverUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />}
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{t.title}</p>
              <p className="text-xs text-white/60 truncate mt-0.5">{t.artist || t.uploader_name || "Unknown"}</p>
            </div>
          </div>}
        </div>
        <TrackOptionsMenu
          track={t}
          variant="plus"
          size={20}
          buttonClassName="w-9 h-9 rounded-full grid place-items-center bg-white/10 hover:bg-white/20 active:scale-90 transition"
          items={[
            { icon: ListMusic, label: "View queue", onClick: () => setShowQueue(true) },
            { icon: SlidersHorizontal, label: "Equalizer", onClick: () => setShowMixer(true) },
            
          ]} />
        
      </div>

      {/* body */}
      <div className="relative flex-1 flex flex-col xl:flex-row min-h-0 gap-4 xl:gap-16 xl:px-16 2xl:px-24 xl:pb-8">
        {/* LEFT: artwork + controls */}
        <div className="flex-1 flex flex-col px-6 md:px-10 xl:px-10 xl:max-w-[580px] xl:mx-auto xl:justify-center min-h-0 pb-[env(safe-area-inset-bottom)]">
          {/* artwork / mobile lyrics */}
          <div className="relative flex-1 xl:flex-none flex items-center justify-center min-h-0 py-4">
            {showingLyrics &&
            <div className="xl:hidden w-full h-full overflow-hidden flex flex-col min-h-0">
                <SyncedLyrics key={t.id} trackId={t.id} position={p.position} fallbackText={t.lyrics_text} resolvedLyrics={lyricsAvailability} onSeek={p.seek} onUnavailable={handleLyricsUnavailable} />
              </div>
            }
              <div
              onPointerDown={onVolPointerDown}
              onPointerMove={onVolPointerMove}
              onPointerUp={onVolPointerEnd}
              onPointerCancel={onVolPointerEnd}
              onLostPointerCapture={()=>{volDrag.current.active=false;}}
              className={`relative aspect-square w-full max-w-[min(38vh,80vw)] xl:max-w-[440px] 2xl:max-w-[480px] xl:max-h-[46vh] 2xl:max-h-[52vh] rounded-3xl overflow-hidden shadow-[0_24px_90px_rgba(0,0,0,0.55)] bg-white/10 shrink-0 touch-none transition-transform duration-500 ${
              p.isPlaying ? "scale-100" : "scale-[0.97]"} ${
              showingLyrics ? "hidden xl:flex" : "flex"}`}>
                
                {coverUrl && !coverFailed ?
              <img src={coverUrl} alt="" draggable={false} onError={() => setCoverFailed(true)} className="w-full h-full object-cover pointer-events-none select-none" /> :

              <div className="w-full h-full grid place-items-center opacity-40">
                    <Disc3 size={64} />
                  </div>
              }
                {/* volume hint */}
                <div
                className={`absolute inset-0 grid place-items-center bg-black/30 backdrop-blur-sm transition-opacity duration-200 ${
                showVolHint ? "opacity-100" : "opacity-0 pointer-events-none"}`
                }>
                  
                  <div className="flex flex-col items-center gap-2">
                    <VolIcon size={40} />
                    <span className="text-4xl font-extrabold tabular-nums">{Math.round(volPct)}%</span>
                    <span className="text-[10px] uppercase tracking-widest opacity-70">Swipe to adjust</span>
                  </div>
                </div>
              </div>
          </div>

          {/* metadata */}
          <div className={`${showingLyrics ? "hidden xl:flex" : "flex"} items-start justify-between gap-3 mt-1 mb-4 shrink-0`}>
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl xl:text-4xl font-extrabold tracking-tight truncate">{t.title}</h2>
              <Link
                to={`/track/${t.id}`}
                onClick={onClose}
                className="text-sm md:text-base opacity-70 hover:opacity-100 truncate block mt-1">
                
                {t.artist || t.uploader_name || "Unknown"}
              </Link>
            </div>
            {hasLyrics && !showLyricsPanel &&
            <button
              onClick={() => setShowLyricsPanel(true)}
              className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-1 ring-white/20 hover:bg-white/10 text-xs font-semibold shrink-0 transition">
                Lyrics
            </button>
            }
          </div>

          {/* scrubber */}
          <div className="mb-1.5 shrink-0">
            <div className="relative h-1.5 bg-white/20 rounded-full group">
              <div className="absolute left-0 top-0 h-1.5 bg-overlay-foreground rounded-full" style={{ width: `${progress}%` }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-overlay-foreground rounded-full shadow-md opacity-0 group-hover:opacity-100 transition"
                style={{ left: `calc(${progress}% - 6px)` }} />
              
              <input
                type="range"
                min={0}
                max={p.duration || 0}
                step="0.1"
                value={p.position}
                onChange={(e) => p.seek(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Seek" />
              
            </div>
            <div className="flex justify-between text-[11px] opacity-70 mt-2 tabular-nums">
              <span>{formatTime(p.position)}</span>
              <span>-{formatTime(remaining)}</span>
            </div>
          </div>

          {/* controls */}
          <div className="flex items-center justify-between gap-2 my-4 shrink-0">
            <IconButton icon={Shuffle} onClick={() => p.setShuffle(!p.shuffle)} active={p.shuffle} label="Shuffle" size={20} />
            <button onClick={() => p.prev()} className="p-2 active:scale-90 transition" aria-label="Previous">
              <SkipBack size={30} fill="white" strokeWidth={1.5} />
            </button>
            <PlayPauseButton isPlaying={p.isPlaying} onClick={() => p.togglePlay()} />
            <button onClick={() => p.next()} className="p-2 active:scale-90 transition" aria-label="Next">
              <SkipForward size={30} fill="white" strokeWidth={1.5} />
            </button>
            <IconButton
              icon={repeatOff ? Repeat : Repeat1}
              onClick={() => p.setRepeat(p.repeat === "off" ? "all" : p.repeat === "all" ? "one" : "off")}
              active={!repeatOff}
              label="Repeat"
              size={20} />
            
          </div>

          {/* volume (desktop inline) */}
          





















          

          {/* mobile artwork / lyrics toggle — only when this track has lyrics */}
          {hasLyrics && (
            <div className="now-playing-view-switch xl:hidden" role="group" aria-label="Now Playing view">
              <button type="button" onClick={() => setLyricsMode(false)} aria-pressed={!showingLyrics}>
                <Disc3 size={15} aria-hidden="true" /> Artwork
              </button>
              <button type="button" onClick={() => setLyricsMode(true)} aria-pressed={showingLyrics}>
                <Mic2 size={15} aria-hidden="true" /> Lyrics
              </button>
            </div>
          )}
        </div>

        {/* RIGHT (desktop): lyrics panel — only when this track has lyrics */}
        <div className={`${hasLyrics && showLyricsPanel ? "hidden xl:flex" : "hidden"} flex-col min-h-0 w-[440px] 2xl:w-[480px] shrink-0 bg-white/[0.06] ring-1 ring-white/10 rounded-[2rem] overflow-hidden`}>
          <div className="flex items-center justify-between px-5 pt-4 pb-1 shrink-0">
            <span className="text-[10px] uppercase tracking-[0.25em] opacity-50 flex items-center gap-2">
              <Mic2 size={13} /> Lyrics
            </span>
            <button
              onClick={() => setShowLyricsPanel(false)}
              className="p-2 rounded-full hover:bg-white/10 opacity-60 hover:opacity-100 transition"
              aria-label="Hide lyrics">
              <X size={18} />
            </button>
          </div>
          








          
          <div className="flex-1 min-h-0 flex flex-col">
            {hasLyrics && showLyricsPanel && <SyncedLyrics key={t.id} trackId={t.id} position={p.position} fallbackText={t.lyrics_text} resolvedLyrics={lyricsAvailability} onSeek={p.seek} onUnavailable={handleLyricsUnavailable} />}
          </div>
        </div>
      </div>

      <QueuePanel open={showQueue} onClose={() => setShowQueue(false)} />
      {loungeOpen && (
        <LoungeHostModal lounge={lounge} onClose={() => setLoungeOpen(false)} />
      )}
      {showMixer && (
        <StemMixer onClose={() => setShowMixer(false)} />
      )}

      {/* copied toast */}
      {copied &&
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-overlay-foreground text-overlay text-xs font-semibold shadow-xl">
          Link copied
        </div>
      }

      {/* mobile bottom toggle bar */}
      




















      

    </div>);

}