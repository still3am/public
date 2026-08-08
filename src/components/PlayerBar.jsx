import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  ListMusic,
  X,
  SlidersHorizontal } from
"lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { Link, useLocation } from "react-router-dom";
import { formatTime } from "@/lib/audio-utils";
import FullScreenPlayer from "@/components/FullScreenPlayer";
import QueuePanel from "@/components/QueuePanel";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { useOfflineCoverUrl } from "@/hooks/useOfflineCoverUrl";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import StemMixer from "@/components/StemMixer";

export default function PlayerBar() {
  const p = usePlayer();
  const { collapsed } = useSidebarCollapsed();
  const location = useLocation();
  const [fullOpen, setFullOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [mixerOpen, setMixerOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [coverFailed, setCoverFailed] = useState(false);
  const drag = useRef({ active: false, startY: 0, moved: false, dy: 0 });

  const onTouchStart = (e) => {
    const touch = e.touches[0];
    drag.current = { active: true, startY: touch.clientY, moved: false, dy: 0 };
  };
  const onTouchMove = (e) => {
    if (!drag.current.active) return;
    const touch = e.touches[0];
    const dy = touch.clientY - drag.current.startY;
    if (dy > 8) {
      drag.current.moved = true;
      drag.current.dy = dy;
      setDragY(dy);
      e.preventDefault();
    }
  };
  const onTouchEnd = () => {
    if (!drag.current.active) return;
    const shouldClear = drag.current.dy > 90;
    drag.current.active = false;
    drag.current.dy = 0;
    if (shouldClear) {
      p.clearQueue();
    }
    setDragY(0);
  };

  const offlineCover = useOfflineCoverUrl(p.currentTrack?.id, p.currentTrack?.cover_art_url);
  const coverUrl = useCoverUrl(offlineCover);
  useEffect(() => { setCoverFailed(false); }, [coverUrl]);
  if (location.pathname === "/onboarding" || !p.currentTrack) return null;
  const t = p.currentTrack;
  const pct = p.duration ? p.position / p.duration * 100 : 0;
  const remaining = Math.max(0, (p.duration || 0) - (p.position || 0));
  const RepeatIcon = p.repeat === "one" ? Repeat1 : Repeat;

  return (
    <>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateY(${dragY}px)`,
          opacity: 1 - Math.min(dragY / 200, 0.6),
          transition: drag.current.active ? "none" : "transform .25s ease, opacity .25s ease"
        }}
        className={`fixed left-0 right-0 z-30 bg-background/90 backdrop-blur-xl border-t border-border player-bar-mobile-bottom touch-none transition-[left] duration-300 ease-out ${
        collapsed ? "md:left-[68px]" : "md:left-64"}`
        }>
        {/* progress (mobile - thin top accent) */}
        <div className="h-[3px] w-full bg-foreground/[0.06] relative overflow-hidden">
          <div
            className="absolute left-0 top-0 h-[3px] bg-foreground/80"
            style={{ width: `${pct}%` }} />
          
        </div>

        <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5">
          {/* artwork + meta */}
          <button onClick={() => setFullOpen(true)} className="flex items-center gap-3 min-w-0 flex-1 text-left" aria-label="Open Now Playing">
            <div className="shrink-0 relative">
              {coverUrl && !coverFailed ?
              <img src={coverUrl} alt="" onError={() => setCoverFailed(true)} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shadow-md" /> :

              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-foreground/10 grid place-items-center text-foreground/30">
                  <ListMusic size={18} />
                </div>
              }
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                {t.title}
                {t.explicit &&
                <span className="px-1 py-0.5 rounded bg-foreground/15 text-[9px] font-extrabold leading-none">E</span>
                }
              </div>
              <div className="text-xs text-foreground/50 truncate">
                {t.artist || t.uploader_name || "Unknown"}
              </div>
              <div className="text-[10px] text-foreground/40 mt-0.5 hidden sm:flex items-center gap-1">
                <span>{formatTime(p.position)}</span>
                <span>-{formatTime(remaining)}</span>
              </div>
            </div>
          </button>

          {/* mobile controls */}
          <div className="flex items-center gap-1 shrink-0 md:hidden">
            <button onClick={p.prev} className="p-2 rounded-full hover:bg-foreground/5 active:scale-90 transition" aria-label="Previous">
              <SkipBack size={18} />
            </button>
            <button
              onClick={p.togglePlay}
              className="w-11 h-11 rounded-full bg-foreground text-background grid place-items-center hover:scale-105 active:scale-95 transition shadow-md"
              aria-label={p.isPlaying ? "Pause" : "Play"}>
              
              {p.isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
            </button>
            <button onClick={p.next} className="p-2 rounded-full hover:bg-foreground/5 active:scale-90 transition" aria-label="Next">
              <SkipForward size={18} />
            </button>
          </div>

          {/* desktop controls */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <button
              onClick={() => p.setRepeat(p.repeat === "off" ? "all" : p.repeat === "all" ? "one" : "off")}
              className={`p-2 rounded-full hover:bg-foreground/5 active:scale-90 transition ${p.repeat !== "off" ? "text-foreground" : "text-foreground/40"}`}
              aria-label="Repeat">
              
              <RepeatIcon size={18} />
            </button>
            <button
              onClick={() => p.setShuffle(!p.shuffle)}
              className={`p-2 rounded-full hover:bg-foreground/5 active:scale-90 transition ${p.shuffle ? "text-foreground" : "text-foreground/40"}`}
              aria-label="Shuffle">
              
              <Shuffle size={18} />
            </button>
            <button onClick={p.prev} className="p-2 rounded-full hover:bg-foreground/5 active:scale-90 transition" aria-label="Previous">
              <SkipBack size={20} />
            </button>
            <button
              onClick={p.togglePlay}
              className="w-11 h-11 rounded-full bg-foreground text-background grid place-items-center hover:scale-105 active:scale-95 transition shadow"
              aria-label={p.isPlaying ? "Pause" : "Play"}>
              
              {p.isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
            </button>
            <button onClick={p.next} className="p-2 rounded-full hover:bg-foreground/5 active:scale-90 transition" aria-label="Next">
              <SkipForward size={20} />
            </button>
            <button
              onClick={() => setMixerOpen(true)}
              className={`p-2 rounded-full hover:bg-foreground/5 active:scale-90 transition ${
                p.mixer.bass !== 0 || p.mixer.vocals !== 0 || p.mixer.treble !== 0 || p.mixer.vocalCut ? "text-foreground" : "text-foreground/40"}`}
              aria-label="Mix">
              <SlidersHorizontal size={18} />
            </button>
            <button
              onClick={() => setQueueOpen(true)}
              className={`relative p-2 rounded-full hover:bg-foreground/5 active:scale-90 transition ${
              p.queue.length - p.currentIndex - 1 > 0 ? "text-foreground" : "text-foreground/40"}`
              }
              aria-label="Queue">
              
              <ListMusic size={18} />
              {p.queue.length - p.currentIndex - 1 > 0 &&
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-foreground text-background text-[10px] font-bold grid place-items-center hidden">
                  {p.queue.length - p.currentIndex - 1}
                </span>
              }
            </button>
            <div className="flex items-center gap-2 pl-1">
              <button onClick={() => p.setMuted(!p.muted)} className="p-1 active:scale-90 transition" aria-label="Mute">
                {p.muted || p.volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max={2}
                step="0.01"
                value={p.muted ? 0 : p.volume}
                onChange={(e) => p.setVolume(Number(e.target.value))}
                className="w-24 accent-foreground"
                aria-label="Volume" />
              <button
                onClick={p.clearQueue}
                className="p-1.5 rounded-full hover:bg-foreground/10 active:scale-90 transition text-foreground/40 hover:text-foreground"
                aria-label="Close player">
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {fullOpen &&
      <FullScreenPlayer
        onClose={() => setFullOpen(false)} />

      }
      {queueOpen && p.currentTrack &&
      <div className="fixed inset-0 z-50">
          <QueuePanel open={queueOpen} onClose={() => setQueueOpen(false)} />
        </div>
      }
      {mixerOpen && p.currentTrack &&
        <StemMixer onClose={() => setMixerOpen(false)} />
      }
    </>);

}