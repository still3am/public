import { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { useColorExtraction } from "@/hooks/useColorExtraction";
import { useLikes } from "@/hooks/useLikes";
import { useAuth } from "@/lib/AuthContext";
import { formatTime } from "@/lib/audio-utils";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  Heart,
  MoreHorizontal,
  ListMusic,
  Mic2,
  Volume2,
  VolumeX,
  Gauge,
  Timer } from
"lucide-react";

export default function FullScreenPlayer({ onClose, onOpenQueue }) {
  const p = usePlayer();
  const { user } = useAuth();
  const likes = useLikes(user);
  const bg = useColorExtraction(p.currentTrack?.cover_art_url);
  const [showLyrics, setShowLyrics] = useState(false);
  const t = p.currentTrack;

  if (!t) return null;
  const liked = likes.likedIds.has(t.id);

  const progress = p.duration ? p.position / p.duration * 100 : 0;
  const remaining = Math.max(0, (p.duration || 0) - (p.position || 0));
  const volPct = (p.muted ? 0 : p.volume) * 100;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto text-white animate-[fadeIn_.15s_ease-out]"
      style={{
        background: `linear-gradient(180deg, ${bg} 0%, #0a0a0a 100%)`
      }}>
      
      <div className="max-w-md mx-auto px-6 pt-12 pb-10 min-h-screen flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-2 -ml-2" aria-label="Close">
            <ChevronDown size={28} />
          </button>
          <div className="text-[11px] uppercase tracking-[0.25em] opacity-70">
            Now Playing
          </div>
          

          
        </div>

        {/* album art */}
        <div className="aspect-square w-full rounded-2xl overflow-hidden shadow-2xl bg-white/10 mt-1 mb-8 shrink-0">
          {t.cover_art_url &&
          <img
            src={t.cover_art_url}
            alt=""
            className="w-full h-full object-cover" />

          }
        </div>

        {/* metadata */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight truncate">
                {t.title}
              </h2>
              {t.explicit &&
              <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-extrabold leading-none">
                  E
                </span>
              }
            </div>
            <div className="text-base opacity-70 truncate">
              {t.artist || t.uploader_name || "Unknown"}
            </div>
          </div>
          <button
            onClick={() => likes.toggleLike(t)}
            className="p-2 shrink-0"
            aria-label="Like">
            
            <Heart
              size={26}
              className={liked ? "fill-red-500 text-red-500" : ""} />
            
          </button>
        </div>

        {/* scrubber */}
        <div className="mb-3">
          <div className="relative h-2 bg-white/25 rounded-full">
            <div
              className="absolute left-0 top-0 h-2 bg-white rounded-full"
              style={{ width: `${progress}%` }} />
            
            <input
              type="range"
              min={0}
              max={p.duration || 0}
              step="0.1"
              value={p.position}
              onChange={(e) => p.seek(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
              aria-label="Seek" />
            
          </div>
          <div className="flex justify-between text-[11px] opacity-70 mt-1.5">
            <span>{formatTime(p.position)}</span>
            <span>-{formatTime(remaining)}</span>
          </div>
        </div>

        {/* controls */}
        <div className="flex items-center justify-between px-2 mb-7">
          <button
            onClick={() => p.prev()}
            className="p-3 active:scale-95 transition"
            aria-label="Previous">
            
            <SkipBack size={32} fill="white" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => p.togglePlay()}
            className="bg-white text-black w-18 h-18 rounded-full grid place-items-center hover:scale-105 active:scale-95 transition"
            style={{ width: 72, height: 72 }}
            aria-label={p.isPlaying ? "Pause" : "Play"}>
            
            {p.isPlaying ?
            <Pause size={30} fill="black" /> :

            <Play size={30} fill="black" className="ml-1" />
            }
          </button>
          <button
            onClick={() => p.next()}
            className="p-3 active:scale-95 transition"
            aria-label="Next">
            
            <SkipForward size={32} fill="white" strokeWidth={1.5} />
          </button>
        </div>

        {/* volume */}
        <div className="flex items-center gap-3 mb-7">
          <button
            onClick={() => p.setMuted(!p.muted)}
            aria-label="Mute">
            
            {p.muted || p.volume === 0 ?
            <VolumeX size={20} /> :

            <Volume2 size={20} />
            }
          </button>
          <div className="relative flex-1 h-1.5 bg-white/25 rounded-full">
            <div
              className="absolute left-0 top-0 h-1.5 bg-white rounded-full"
              style={{ width: `${volPct}%` }} />
            
            <input
              type="range"
              min={0}
              max={1}
              step="0.01"
              value={p.muted ? 0 : p.volume}
              onChange={(e) => p.setVolume(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
              aria-label="Volume" />
            
          </div>
        </div>

        {/* advanced controls */}
        
















































        

        {/* lyrics panel */}
        {showLyrics &&
        <div className="overflow-y-auto max-h-72 bg-white/10 backdrop-blur rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line mb-6">
            {t.lyrics_text && t.lyrics_text.trim() ?
          t.lyrics_text :

          <div className="opacity-60 italic">
                No lyrics uploaded for this track yet.
              </div>
          }
          </div>
        }

        {/* bottom nav */}
        <div className="mt-auto flex items-center justify-around pt-4 border-t border-white/15">
          <button
            onClick={() => setShowLyrics((v) => !v)}
            className={`flex flex-col items-center text-[11px] hover:opacity-100 ${
            showLyrics ? "opacity-100" : "opacity-70"}`
            }>
            
            <Mic2 size={20} />
            <span className="mt-1">Lyrics</span>
          </button>
          <button
            onClick={onOpenQueue}
            className="flex flex-col items-center text-[11px] opacity-70 hover:opacity-100">
            
            <ListMusic size={20} />
            <span className="mt-1">Queue</span>
          </button>
        </div>
      </div>
    </div>);

}