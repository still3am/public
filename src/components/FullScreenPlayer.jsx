import { useState, useRef, useEffect } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { useColorExtraction } from "@/hooks/useColorExtraction";
import { useLikes } from "@/hooks/useLikes";
import { useAuth } from "@/lib/AuthContext";
import { formatTime } from "@/lib/audio-utils";
import SyncedLyrics from "@/components/SyncedLyrics";
import NowPlayingAddMenu from "@/components/NowPlayingAddMenu";
import { useAddToPlaylist } from "@/hooks/useAddToPlaylist";
import { Link } from "react-router-dom";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  Heart,
  ListMusic,
  Mic2,
  Volume2,
  VolumeX,
  Volume1,
  Repeat,
  Repeat1,
  Shuffle,
  Disc3,
  Share2 } from
"lucide-react";

const clampVol = (v) => Math.max(0, Math.min(1, v));

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

export default function FullScreenPlayer({ onClose, onOpenQueue }) {
  const p = usePlayer();
  const { user } = useAuth();
  const likes = useLikes(user);
  const ap = useAddToPlaylist();
  const bg = useColorExtraction(p.currentTrack?.cover_art_url);
  const [lyricsMode, setLyricsMode] = useState(false);
  const [showVolHint, setShowVolHint] = useState(false);
  const [copied, setCopied] = useState(false);
  const t = p.currentTrack;
  const volDrag = useRef({ startY: 0, start: 0, active: false });
  const hintTimer = useRef(null);
  const dismissDrag = useRef({ startY: 0, active: false, moved: false });

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
          setLyricsMode((v) => !v);
          break;
        case "Escape":
          onClose();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p, onClose]);

  function flashHint() {
    setShowVolHint(true);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setShowVolHint(false), 1000);
  }

  const onVolTouchStart = (e) => {
    const touch = e.touches[0];
    volDrag.current = { startY: touch.clientY, start: p.muted ? 0 : p.volume, active: true };
    flashHint();
  };
  const onVolTouchMove = (e) => {
    if (!volDrag.current.active) return;
    const touch = e.touches[0];
    const dy = volDrag.current.startY - touch.clientY;
    p.setVolume(clampVol(volDrag.current.start + dy / 200));
    e.preventDefault();
  };
  const onVolTouchEnd = () => {
    volDrag.current.active = false;
  };

  async function shareNow(copyOnly = false) {
    if (!t) return;
    const url = `${window.location.origin}/track/${t.id}`;
    if (copyOnly) {
      navigator.clipboard?.writeText(url);
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: `${t.title} on PUBLIC.`, url });
      } catch {}
    } else {
      navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  if (!t) return null;
  const liked = likes.likedIds.has(t.id);
  const progress = p.duration ? p.position / p.duration * 100 : 0;
  const remaining = Math.max(0, (p.duration || 0) - (p.position || 0));
  const volPct = (p.muted ? 0 : p.volume) * 100;
  const repeatOff = p.repeat === "off";
  const isMutedLow = p.muted || p.volume === 0;
  const VolIcon = isMutedLow ? VolumeX : p.volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className="fixed inset-0 z-50 text-white animate-[fadeIn_.25s_ease-out] flex flex-col overflow-hidden"
      style={{ background: `linear-gradient(170deg, ${bg} 0%, #0d0d0f 55%, #000 100%)` }}>
      
      {/* ambient glow */}
      <div
        className="pointer-events-none absolute -top-1/3 left-0 right-0 h-2/3 opacity-40 blur-3xl"
        style={{ background: `radial-gradient(ellipse at center, ${bg} 0%, transparent 70%)` }} />
      

      {/* top bar */}
      <div
        onTouchStart={(e) => {
          const tch = e.touches[0];
          dismissDrag.current = { startY: tch.clientY, active: true, moved: false };
        }}
        onTouchMove={(e) => {
          if (!dismissDrag.current.active) return;
          const dy = e.touches[0].clientY - dismissDrag.current.startY;
          if (dy > 80) {
            dismissDrag.current.moved = true;
            onClose();
            dismissDrag.current.active = false;
          }
        }}
        onTouchEnd={() => { dismissDrag.current.active = false; }}
        className="relative flex items-center justify-between px-4 md:px-8 pt-8 pb-2 shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 active:scale-90 hover:bg-white/10 rounded-full transition" aria-label="Close">
          <ChevronDown size={26} />
        </button>
        <div className="text-center px-4 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.3em] opacity-50">Now Playing</div>
          <div className="text-xs font-semibold opacity-80 truncate max-w-[60vw] md:max-w-md">
            {t.artist || t.uploader_name || "Unknown"}
          </div>
        </div>
        <NowPlayingAddMenu
          onAddToPlaylist={() => ap.addToPlaylist(t.id)}
          onPlayNext={() => p.playNext?.(t)}
          onAddToQueue={() => p.addToQueue?.(t)}
          onShare={shareNow}
          onOpenQueue={onOpenQueue}
          onLike={() => likes.toggleLike(t)}
          liked={likes.likedIds.has(t.id)} />
        
      </div>

      {/* body */}
      <div className="relative flex-1 flex flex-col xl:flex-row min-h-0 gap-2 xl:gap-10 xl:px-10 xl:pb-3">
        {/* LEFT: artwork + controls */}
        <div className="flex-1 flex flex-col px-5 md:px-10 xl:px-2 min-h-0">
          {/* artwork / mobile lyrics */}
          <div className="relative flex-1 flex items-center justify-center min-h-0 py-3">
            {lyricsMode && (
              <div className="xl:hidden w-full h-full rounded-3xl bg-white/[0.06] overflow-hidden flex flex-col min-h-0">
                <SyncedLyrics trackId={t.id} position={p.position} fallbackText={t.lyrics_text} onSeek={p.seek} />
              </div>
            )}
              <div
                onTouchStart={onVolTouchStart}
                onTouchMove={onVolTouchMove}
                onTouchEnd={onVolTouchEnd}
                className={`relative aspect-square w-full max-w-[min(46vh,86vw)] xl:max-w-[520px] rounded-3xl overflow-hidden shadow-2xl bg-white/10 shrink-0 touch-none transition-transform duration-500 ${
                p.isPlaying ? "scale-100" : "scale-[0.97]"} ${
                lyricsMode ? "hidden xl:flex" : "flex"}`}>
                
                {t.cover_art_url ?
                <img src={t.cover_art_url} alt="" className="w-full h-full object-cover" /> :

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
          <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl xl:text-3xl font-extrabold tracking-tight truncate">{t.title}</h2>
              <Link
                to={`/track/${t.id}`}
                onClick={onClose}
                className="text-sm md:text-base opacity-70 hover:opacity-100 truncate block mt-1">
                
                {t.artist || t.uploader_name || "Unknown"}
              </Link>
            </div>
            <button
              onClick={() => likes.toggleLike(t)}
              className="p-2 shrink-0 active:scale-90 hover:bg-white/10 rounded-full transition"
              aria-label="Like">
              
              <Heart size={26} className={liked ? "fill-red-500 text-red-500" : ""} />
            </button>
          </div>

          {/* scrubber */}
          <div className="mb-1.5 shrink-0">
            <div className="relative h-1.5 bg-white/20 rounded-full group">
              <div className="absolute left-0 top-0 h-1.5 bg-white rounded-full" style={{ width: `${progress}%` }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition"
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
            <div className="flex justify-between text-[11px] opacity-70 mt-1.5 tabular-nums">
              <span>{formatTime(p.position)}</span>
              <span>-{formatTime(remaining)}</span>
            </div>
          </div>

          {/* controls */}
          <div className="flex items-center justify-between gap-2 my-3 shrink-0">
            <IconButton icon={Shuffle} onClick={() => p.setShuffle(!p.shuffle)} active={p.shuffle} label="Shuffle" size={20} />
            <button onClick={() => p.prev()} className="p-2 active:scale-90 transition" aria-label="Previous">
              <SkipBack size={30} fill="white" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => p.togglePlay()}
              className="w-16 h-16 xl:w-20 xl:h-20 rounded-full bg-white text-black grid place-items-center hover:scale-105 active:scale-95 transition shadow-xl"
              aria-label={p.isPlaying ? "Pause" : "Play"}>
              
              {p.isPlaying ? <Pause size={28} fill="black" /> : <Play size={28} fill="black" className="ml-1" />}
            </button>
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
          <div className="hidden xl:flex items-center gap-2 shrink-0 mb-2 opacity-90">
            <button onClick={() => p.setMuted(!p.muted)} aria-label="Mute" className="active:scale-90 transition shrink-0">
              <VolIcon size={18} />
            </button>
            <div className="relative flex-1 max-w-xs h-1.5 bg-white/20 rounded-full group">
              <div className="absolute left-0 top-0 h-1.5 bg-white rounded-full" style={{ width: `${volPct}%` }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition"
                style={{ left: `calc(${volPct}% - 6px)` }} />
              
              <input
                type="range"
                min={0}
                max={1}
                step="0.01"
                value={p.muted ? 0 : p.volume}
                onChange={(e) => p.setVolume(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Volume" />
              
            </div>
            <span className="text-[11px] tabular-nums opacity-60 w-9 text-right">{Math.round(volPct)}%</span>
          </div>

          {/* mobile artwork / lyrics toggle */}
          <div className="xl:hidden flex items-center gap-1 mx-auto mt-1 mb-3 p-1 rounded-full bg-white/10 shrink-0">
            <button
              onClick={() => setLyricsMode(false)}
              className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full transition text-xs font-semibold ${
                !lyricsMode ? "bg-white text-black" : "opacity-70"}`}
              aria-label="Artwork">
              <Disc3 size={14} /> Artwork
            </button>
            <button
              onClick={() => setLyricsMode(true)}
              className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full transition text-xs font-semibold ${
                lyricsMode ? "bg-white text-black" : "opacity-70"}`}
              aria-label="Lyrics">
              <Mic2 size={14} /> Lyrics
            </button>
          </div>
        </div>

        {/* RIGHT (desktop): lyrics panel */}
        <div className="hidden xl:flex flex-col min-h-0 w-[400px] shrink-0 bg-white/[0.06] rounded-3xl overflow-hidden">
          <div className="flex items-center justify-center gap-6 px-5 pt-4 pb-2 shrink-0">
            <button
              onClick={() => setLyricsMode(false)}
              className={`text-xs uppercase tracking-widest font-semibold transition ${
              !lyricsMode ? "opacity-100" : "opacity-40"}`
              }>
              
              <Disc3 size={18} className="inline mr-1" /> Cover
            </button>
            <div className="w-px h-3 bg-white/20" />
            <button
              onClick={() => setLyricsMode(true)}
              className={`text-xs uppercase tracking-widest font-semibold transition ${
              lyricsMode ? "opacity-100" : "opacity-40"}`
              }>
              
              <Mic2 size={18} className="inline mr-1" /> Lyrics
            </button>
          </div>
          <div className="flex-1 min-h-0">
            {lyricsMode ?
            <SyncedLyrics trackId={t.id} position={p.position} fallbackText={t.lyrics_text} onSeek={p.seek} /> :

            <div className="h-full grid place-items-center p-8 text-center">
                <div>
                  <Disc3 size={48} className="mx-auto opacity-30 mb-3" />
                  <p className="text-sm opacity-50 leading-relaxed">
                    Switch to Lyrics to follow along,
                    <br /> or swipe on the cover to change volume.
                  </p>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      {/* copied toast */}
      {copied &&
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white text-black text-xs font-semibold shadow-xl">
          Link copied
        </div>
      }

      {/* mobile bottom toggle bar */}
      




















      

      {ap.modal}
    </div>);

}