import { useState } from "react";
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
  ListMusic } from
"lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { Link } from "react-router-dom";
import { formatTime } from "@/lib/audio-utils";
import QueueDrawer from "@/components/QueueDrawer";
import FullScreenPlayer from "@/components/FullScreenPlayer";

export default function PlayerBar() {
  const p = usePlayer();
  const [queueOpen, setQueueOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  if (!p.currentTrack) return null;
  const t = p.currentTrack;
  const bars = p.getBars(t.id);
  const played = p.duration ? p.position / p.duration * bars.length : 0;

  return (
    <>
      <div className="fixed left-0 right-0 md:left-64 z-30 bg-background/85 backdrop-blur-xl border-t border-border player-bar-mobile-bottom">
        {p.duration > 0 && (
          <div className="h-1 w-full bg-foreground/[0.08] relative overflow-hidden">
            <div
              className="absolute left-0 top-0 h-1 bg-foreground/70"
              style={{ width: `${(p.position / p.duration) * 100}%` }}
            />
          </div>
        )}
        

























        
        <div className="flex items-center gap-3 px-4 pb-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => setFullOpen(true)}
              className="shrink-0"
              aria-label="Open Now Playing">
              
              {t.cover_art_url ?
              <img
                src={t.cover_art_url}
                alt=""
                className="w-12 h-12 rounded-lg object-cover" /> :


              <div className="w-12 h-12 rounded-lg bg-foreground/10" />
              }
            </button>
            <Link to={`/track/${t.id}`} className="min-w-0">
              <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                {t.title}
                {t.explicit &&
                <span className="px-1 py-0.5 rounded bg-foreground/15 text-[9px] font-extrabold leading-none">
                    E
                  </span>
                }
              </div>
              <div className="text-xs text-foreground/50 truncate">
                {t.artist || t.uploader_name || "Unknown"}
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={p.prev}
              className="p-2 rounded-full hover:bg-foreground/5"
              aria-label="Previous">
              
              <SkipBack size={18} />
            </button>
            <button
              onClick={p.togglePlay}
              className="p-3 rounded-full bg-foreground text-background hover:scale-105 transition"
              aria-label={p.isPlaying ? "Pause" : "Play"}>
              
              {p.isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              onClick={p.next}
              className="p-2 rounded-full hover:bg-foreground/5"
              aria-label="Next">
              
              <SkipForward size={18} />
            </button>
          </div>
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              onClick={() =>
              p.setRepeat(
                p.repeat === "off" ? "all" : p.repeat === "all" ? "one" : "off"
              )
              }
              className={`p-2 rounded-full hover:bg-foreground/5 ${
              p.repeat !== "off" ? "text-foreground" : "text-foreground/40"}`
              }
              aria-label="Repeat">
              
              {p.repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </button>
            <button
              onClick={() => p.setShuffle(!p.shuffle)}
              className={`p-2 rounded-full hover:bg-foreground/5 ${
              p.shuffle ? "text-foreground" : "text-foreground/40"}`
              }
              aria-label="Shuffle">
              
              <Shuffle size={18} />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => p.setMuted(!p.muted)}
                className="p-1"
                aria-label="Mute">
                
                {p.muted || p.volume === 0 ?
                <VolumeX size={18} /> :

                <Volume2 size={18} />
                }
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={p.muted ? 0 : p.volume}
                onChange={(e) => p.setVolume(Number(e.target.value))}
                className="w-24 accent-foreground"
                aria-label="Volume" />
              
            </div>
            <button
              onClick={() => setQueueOpen(true)}
              className="p-2 rounded-full hover:bg-foreground/5"
              aria-label="Queue">
              
              <ListMusic size={18} />
            </button>
          </div>
        </div>
      </div>
      {fullOpen &&
      <FullScreenPlayer
        onClose={() => setFullOpen(false)}
        onOpenQueue={() => {
          setFullOpen(false);
          setQueueOpen(true);
        }} />

      }
      {queueOpen && <QueueDrawer p={p} onClose={() => setQueueOpen(false)} />}
    </>);

}