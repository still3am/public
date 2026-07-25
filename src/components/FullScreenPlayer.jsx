import { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { useColorExtraction } from "@/hooks/useColorExtraction";
import { useLikes } from "@/hooks/useLikes";
import { useAuth } from "@/lib/AuthContext";
import { formatTime } from "@/lib/audio-utils";
import SyncedLyrics from "@/components/SyncedLyrics";
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
  Repeat,
  Repeat1,
  Shuffle,
  Disc3 } from
"lucide-react";

export default function FullScreenPlayer({ onClose, onOpenQueue }) {
  const p = usePlayer();
  const { user } = useAuth();
  const likes = useLikes(user);
  const bg = useColorExtraction(p.currentTrack?.cover_art_url);
  const [lyricsMode, setLyricsMode] = useState(false);
  const t = p.currentTrack;

  if (!t) return null;
  const liked = likes.likedIds.has(t.id);
  const progress = p.duration ? p.position / p.duration * 100 : 0;
  const remaining = Math.max(0, (p.duration || 0) - (p.position || 0));
  const volPct = (p.muted ? 0 : p.volume) * 100;

  const RepeatIcon = p.repeat === "one" ? Repeat1 : Repeat;

  return (
    <div
      className="fixed inset-0 z-50 text-white animate-[fadeIn_.2s_ease-out] flex flex-col"
      style={{ background: `linear-gradient(165deg, ${bg} 0%, #0b0b0b 60%, #000 100%)` }}>
      
      {/* top bar */}
      <div className="flex items-center justify-between px-5 pt-10 pb-3 shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 active:scale-90 transition" aria-label="Close">
          <ChevronDown size={28} />
        </button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] opacity-60">Now Playing</div>
          

          
        </div>
        <button onClick={onOpenQueue} className="p-2 -mr-2 active:scale-90 transition" aria-label="Queue">
          <ListMusic size={22} />
        </button>
      </div>

      {lyricsMode ?
      <div className="flex-1 flex flex-col min-h-0">
          <SyncedLyrics trackId={t.id} position={p.position} fallbackText={t.lyrics_text} onSeek={p.seek} />
        </div> :

      <div className="flex-1 flex flex-col px-6 min-h-0">
          {/* artwork */}
          <div className="aspect-square w-full rounded-3xl overflow-hidden shadow-2xl bg-white/10 mt-3 mb-7 shrink-0">
            {t.cover_art_url ?
          <img src={t.cover_art_url} alt="" className="w-full h-full object-cover" /> :

          <div className="w-full h-full grid place-items-center opacity-40">
                <Disc3 size={64} />
              </div>
          }
          </div>

          {/* metadata */}
          <div className="flex items-end justify-between gap-3 mb-5">
            <div className="min-w-0">
              <h2 className="text-2xl font-extrabold tracking-tight truncate">{t.title}</h2>
              <Link to={`/track/${t.id}`} className="text-base opacity-70 hover:opacity-100 truncate block mt-0.5">
                {t.artist || t.uploader_name || "Unknown"}
              </Link>
            </div>
            <button onClick={() => likes.toggleLike(t)} className="p-2 shrink-0 active:scale-90 transition" aria-label="Like">
              <Heart size={26} className={liked ? "fill-red-500 text-red-500" : ""} />
            </button>
          </div>

          <div className="mt-auto pb-2">
            {/* scrubber */}
            <div className="mb-1.5">
              <div className="relative h-1.5 bg-white/25 rounded-full">
                <div className="absolute left-0 top-0 h-1.5 bg-white rounded-full" style={{ width: `${progress}%` }} />
                <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md"
                style={{ left: `calc(${progress}% - 6px)` }} />
              
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
            <div className="flex items-center justify-between mt-4 mb-6">
              <button onClick={() => p.setShuffle(!p.shuffle)} className={`p-2 active:scale-90 transition ${p.shuffle ? "opacity-100" : "opacity-40"}`} aria-label="Shuffle">
                <Shuffle size={20} />
              </button>
              <button onClick={() => p.prev()} className="p-2 active:scale-90 transition" aria-label="Previous">
                <SkipBack size={32} fill="white" strokeWidth={1.5} />
              </button>
              <button
              onClick={() => p.togglePlay()}
              className="w-16 h-16 rounded-full bg-white text-black grid place-items-center hover:scale-105 active:scale-95 transition shadow-xl"
              aria-label={p.isPlaying ? "Pause" : "Play"}>
              
                {p.isPlaying ? <Pause size={28} fill="black" /> : <Play size={28} fill="black" className="ml-1" />}
              </button>
              <button onClick={() => p.next()} className="p-2 active:scale-90 transition" aria-label="Next">
                <SkipForward size={32} fill="white" strokeWidth={1.5} />
              </button>
              <button
              onClick={() => p.setRepeat(p.repeat === "off" ? "all" : p.repeat === "all" ? "one" : "off")}
              className={`p-2 active:scale-90 transition ${p.repeat !== "off" ? "opacity-100" : "opacity-40"}`}
              aria-label="Repeat">
              
                <RepeatIcon size={20} />
              </button>
            </div>

            {/* volume */}
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => p.setMuted(!p.muted)} aria-label="Mute" className="active:scale-90 transition">
                {p.muted || p.volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <div className="relative flex-1 h-1 bg-white/25 rounded-full">
                <div className="absolute left-0 top-0 h-1 bg-white rounded-full" style={{ width: `${volPct}%` }} />
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
          </div>
        </div>
      }

      {/* bottom toggle bar */}
      <div className="flex items-center justify-center gap-10 py-4 pb-9 border-t border-white/10 shrink-0">
        <button
          onClick={() => setLyricsMode(false)}
          className={`flex flex-col items-center text-[10px] uppercase tracking-wider active:scale-95 transition ${
          !lyricsMode ? "opacity-100" : "opacity-45"}`
          }
          aria-label="Show cover">
          
          <Disc3 size={20} />
          <span className="mt-1">Artwork</span>
        </button>
        <button
          onClick={() => setLyricsMode(true)}
          className={`flex flex-col items-center text-[10px] uppercase tracking-wider active:scale-95 transition ${
          lyricsMode ? "opacity-100" : "opacity-45"}`
          }
          aria-label="Show lyrics">
          
          <Mic2 size={20} />
          <span className="mt-1">Lyrics</span>
        </button>
      </div>
    </div>);

}