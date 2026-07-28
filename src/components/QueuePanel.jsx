import { X, Trash2, Play, Pause, ListMusic, Plus } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { formatTime } from "@/lib/audio-utils";
import QueueLibraryPicker from "@/components/QueueLibraryPicker";
import { useState } from "react";

export default function QueuePanel({ open, onClose }) {
  const p = usePlayer();
  const [showPicker, setShowPicker] = useState(false);
  if (!open) return null;

  const upcoming = p.queue.
  map((t, i) => ({ t, i })).
  filter(({ i }) => i > p.currentIndex);

  return (
    <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-xl flex flex-col animate-[fadeIn_.2s_ease-out]">
      <div className="flex items-center justify-between px-5 pt-8 pb-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ListMusic size={20} className="opacity-80 shrink-0" />
          <h2 className="text-lg font-bold truncate hidden">
            Queue{upcoming.length ? ` · ${upcoming.length}` : ""}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPicker(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition text-xs font-semibold"
            aria-label="Add from library">
            
            <Plus size={16} /> Add
          </button>
          {upcoming.length > 0 &&
          <button
            onClick={() => {
              if (
              confirm("Clear all queued tracks?"))
              {
                const keep = p.queue.slice(0, p.currentIndex + 1);
                p.setQueue(keep);
              }
            }}
            className="p-2 rounded-full hover:bg-white/10 active:scale-90 transition"
            aria-label="Clear queue">
            
              <Trash2 size={18} />
            </button>
          }
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 active:scale-90 transition"
            aria-label="Close">
            
            <X size={22} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-10">
        {p.currentTrack ?
        <div className="px-1 pt-1 pb-3">
            <div className="text-[10px] uppercase tracking-widest opacity-50 px-1 mb-1">
              Now playing
            </div>
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/10">
              <div className="w-10 h-10 rounded overflow-hidden bg-white/10 shrink-0">
                {p.currentTrack.cover_art_url &&
              <img
                src={p.currentTrack.cover_art_url}
                alt=""
                className="w-full h-full object-cover" />

              }
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">
                  {p.currentTrack.title}
                </div>
                <div className="text-xs text-white/50 truncate">
                  {p.currentTrack.artist || p.currentTrack.uploader_name || "Unknown"}
                </div>
              </div>
              <button
              onClick={p.togglePlay}
              className="shrink-0 w-9 h-9 rounded-full bg-white text-black grid place-items-center active:scale-90 transition"
              aria-label={p.isPlaying ? "Pause" : "Play"}>
              
                {p.isPlaying ?
              <Pause size={16} fill="black" /> :

              <Play size={16} fill="black" className="ml-0.5" />
              }
              </button>
            </div>
          </div> :
        null}

        <div className="text-[10px] uppercase tracking-widest opacity-50 px-2 mb-1">
          {upcoming.length ? "Next up" : ""}
        </div>
        {!upcoming.length ?
        <div className="text-center py-16 px-6">
          <ListMusic size={40} className="mx-auto opacity-30 mb-3" />
          <p className="text-sm text-white/50 mb-4">Your queue is empty.</p>
          <p className="text-xs text-white/40">
            Tap "Add" above to queue songs from your library.
          </p>
        </div> :

        <div className="space-y-0.5">
            {upcoming.map(({ t, i }) =>
          <div
            key={t.id + i}
            className="group flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition">
            
                <div className="w-10 h-10 rounded overflow-hidden bg-white/10 shrink-0 relative">
                  {t.cover_art_url &&
              <img
                src={t.cover_art_url}
                alt=""
                className="w-full h-full object-cover" />

              }
                  <button
                onClick={() => p.playQueueItem(i)}
                className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 group-hover:opacity-100 transition"
                aria-label="Play this track">
                
                    <Play size={16} fill="white" />
                  </button>
                </div>
                <button
              onClick={() => p.playQueueItem(i)}
              className="min-w-0 flex-1 text-left">
              
                  <div className="text-sm font-medium truncate">{t.title}</div>
                  <div className="text-xs text-white/50 truncate">
                    {t.artist || t.uploader_name || "Unknown"}
                  </div>
                </button>
                <span className="hidden sm:block text-[11px] text-white/40 tabular-nums">
                  {formatTime(t.duration_seconds)}
                </span>
                <button
              onClick={() => p.removeFromQueue(i)}
              className="shrink-0 w-9 h-9 rounded-full grid place-items-center text-white/50 hover:text-white hover:bg-white/10 active:scale-90 transition"
              aria-label="Remove from queue">
              
                  <Trash2 size={16} />
                </button>
              </div>
          )}
          </div>
        }
      </div>

      <QueueLibraryPicker open={showPicker} onClose={() => setShowPicker(false)} />
    </div>);

}