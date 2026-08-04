import { useMemo } from "react";
import {
  X,
  Trash2,
  Play,
  Pause,
  ListMusic,
  Plus,
  Music2,
  GripVertical,
  GitMerge } from
"lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import { formatTime } from "@/lib/audio-utils";
import QueueLibraryPicker from "@/components/QueueLibraryPicker";
import { useState } from "react";
import {
  useTransitions } from
"@/hooks/useTransitions";
import { TRANSITION_MODES } from "@/lib/transitions";

export default function QueuePanel({ open, onClose }) {
  const p = usePlayer();
  const { user } = useAuth();
  const t = useTransitions();
  const nav = useNavigate();
  const [showPicker, setShowPicker] = useState(false);

  const upcoming = useMemo(
    () => p.queue.map((trk, i) => ({ trk, i })).filter(({ i }) => i > p.currentIndex),
    [p.queue, p.currentIndex]
  );

  if (!open) return null;

  const isAdmin = !!user && user.role === "admin";
  const transitionLabel =
  t.mode === TRANSITION_MODES.OFF ?
  null :
  t.isAutoMix && isAdmin ?
  "AutoMix" :
  t.isGapless ?
  "Gapless" :
  t.isCrossfade ?
  `Crossfade ${t.crossfadeSeconds}s` :
  null;

  return (
    <div className="absolute inset-0 z-[60] bg-black/85 backdrop-blur-2xl flex flex-col animate-[fadeIn_.22s_ease-out]">
      {/* Header */}
      <div className="top-bar-safe flex items-center justify-between px-4 pt-2 pb-3 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <ListMusic size={20} className="text-white/80 shrink-0" />
          <div className="leading-tight min-w-0">
            <h2 className="text-base font-bold truncate">Queue</h2>
            





            
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowPicker(true)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition"
            aria-label="Add from library">
            <Plus size={18} />
          </button>
          {upcoming.length > 0 &&
          <button
            onClick={() => {
              if (confirm("Clear all queued tracks?")) {
                const keep = p.queue.slice(0, p.currentIndex + 1);
                p.setQueue(keep);
              }
            }}
            className="p-2 rounded-full hover:bg-white/10 active:scale-90 transition text-white/70"
            aria-label="Clear queue">
              <Trash2 size={18} />
            </button>
          }
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 active:scale-90 transition text-white/80"
            aria-label="Close">
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-10">
        {/* Now playing */}
        {p.currentTrack &&
        <div className="px-1 pt-3 pb-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 px-1 mb-1.5">
              Now playing
            </div>
            <div className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl bg-gradient-to-r from-white/12 to-white/[0.04] ring-1 ring-white/10">
              <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-white/10 shrink-0">
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
                <div className="text-xs text-white/55 truncate">
                  {p.currentTrack.artist || p.currentTrack.uploader_name || "Unknown"}
                </div>
              </div>
              <button
              onClick={p.togglePlay}
              className="shrink-0 w-9 h-9 rounded-full bg-white text-black grid place-items-center active:scale-90 transition"
              aria-label={p.isPlaying ? "Pause" : "Play"}>
                {p.isPlaying ?
              <Pause size={15} fill="black" /> :

              <Play size={15} fill="black" className="ml-0.5" />
              }
              </button>
            </div>
          </div>
        }

        {/* Transition status */}
        {transitionLabel &&
        <button
          onClick={() => {
            onClose();
            nav("/settings/transitions");
          }}
          className="w-full mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0A84FF]/15 text-[#3DA0FF] text-[11px] font-semibold active:scale-[0.99] transition">
            <GitMerge size={13} />
            <span className="flex-1 text-left">{transitionLabel} active</span>
            <span className="text-white/50 text-[10px]">Edit</span>
          </button>
        }

        {/* Upcoming */}
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 px-2 mb-1">
          {upcoming.length ? "Next up" : ""}
        </div>
        {!upcoming.length ?
        <div className="text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-white/5 grid place-items-center mx-auto mb-4">
              <Music2 size={30} className="text-white/40" />
            </div>
            <p className="text-sm text-white/55 mb-1">Your queue is empty.</p>
            <p className="text-xs text-white/35">
              Tap “Add” above to queue songs from your library. Auto-queue keeps
              the music going when you reach the end.
            </p>
          </div> :

        <DragDropContext
          onDragEnd={(res) => {
            if (!res.destination) return;
            const from = upcoming[res.source.index]?.i;
            const to = upcoming[res.destination.index]?.i;
            if (from == null || to == null) return;
            p.moveInQueue(from, to);
          }}>
          <Droppable droppableId="queue">
            {(dropProvided) =>
            <div className="space-y-0.5" ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
            {upcoming.map(({ trk: tt, i }, pos) =>
              <Draggable key={tt.id + i} draggableId={tt.id + i} index={pos}>
            {(dragProvided, snapshot) =>
                <div
                  ref={dragProvided.innerRef}
                  {...dragProvided.draggableProps}
                  className={`group flex items-center gap-3 px-2 py-2 rounded-xl transition ${
                  snapshot.isDragging ? "bg-white/[0.12] ring-1 ring-white/15" : "hover:bg-white/[0.06]"}`}>
                <div
                    {...dragProvided.dragHandleProps}
                    className="shrink-0 -ml-1 p-1 text-white/30 hover:text-white/70 cursor-grab active:cursor-grabbing touch-none"
                    aria-label="Reorder">
                  <GripVertical size={16} />
                </div>

            
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0">
                  {tt.cover_art_url &&
                    <img
                      src={tt.cover_art_url}
                      alt=""
                      className="w-full h-full object-cover" />

                    }
                  <button
                      onClick={() => p.playQueueItem(i)}
                      className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 group-hover:opacity-100 transition"
                      aria-label="Play this track">
                    <Play size={15} fill="white" />
                  </button>
                </div>
                <button
                    onClick={() => p.playQueueItem(i)}
                    className="min-w-0 flex-1 text-left">
                  <div className="text-sm font-medium truncate">{tt.title}</div>
                  <div className="text-xs text-white/50 truncate">
                    {tt.artist || tt.uploader_name || "Unknown"}
                  </div>
                </button>
                <span className="hidden sm:block text-[11px] text-white/40 tabular-nums">
                  {formatTime(tt.duration_seconds)}
                </span>
                <button
                    onClick={() => p.removeFromQueue(i)}
                    className="shrink-0 w-8 h-8 rounded-full grid place-items-center text-white/45 hover:text-white hover:bg-white/10 active:scale-90 transition"
                    aria-label="Remove from queue">
                  <Trash2 size={15} />
                </button>
              </div>
                }
          </Draggable>
              )}
            {dropProvided.placeholder}
          </div>
            }
          </Droppable>
        </DragDropContext>
        }
      </div>

      <QueueLibraryPicker open={showPicker} onClose={() => setShowPicker(false)} />
    </div>);

}