import {useLongPressMenu} from '@/hooks/useLongPressMenu';
import { createPortal } from "react-dom";
import { useEffect, useMemo } from "react";
import { useCoverUrl } from "@/hooks/useCoverUrl";
function QueueCover({ url }) {const cover = useCoverUrl(url);return cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : <Music2 size={18} className="text-muted-foreground" />;}
import {
  X,
  Trash2,
  Play,
  Pause,
  Plus,
  Music2,
  GripVertical,
  GitMerge, Search } from
"lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { formatTime } from "@/lib/audio-utils";
import QueueLibraryPicker from "@/components/QueueLibraryPicker";
import TrackOptionsMenu from "@/components/track/TrackOptionsMenu";
import { useState } from "react";
import {
  useTransitions } from
"@/hooks/useTransitions";
import { TRANSITION_MODES } from "@/lib/transitions";

/** @param {any} props */
function QueueMenuRow({provided,dragging,children}){
 const lp=useLongPressMenu(dragging,{allowButtons:true});
 return <div ref={node=>{provided.innerRef(node);lp.ref.current=node;}} {...provided.draggableProps} {...lp.handlers}
  onClickCapture={event=>{if(!event.currentTarget.contains(event.target))return;if(lp.consumeLongPress()){event.preventDefault();event.stopPropagation();}}}
  style={{...provided.draggableProps.style,touchAction:dragging?'none':'pan-y'}}
  className={'queue-upcoming-row song-menu-surface group flex items-center gap-3 px-2 py-2 rounded-xl transition '+(dragging?'bg-accent ring-1 ring-border':'hover:bg-accent')}>{children(lp)}</div>;
}

export default function QueuePanel({ open, onClose }) {
  const p = usePlayer();
  const t = useTransitions();
  const nav = useNavigate();
  const [showPicker, setShowPicker] = useState(false);
  const [query, setQuery] = useState(""),[dragRows, setDragRows] = useState(null);
  useEffect(() => {if (!open) {setShowPicker(false);setQuery("");setDragRows(null);}}, [open]);

  const upcoming = useMemo(
    () => p.queue.map((trk, i) => ({ trk, i })).filter(({ i }) => i > p.currentIndex),
    [p.queue, p.currentIndex]
  );

  const history = useMemo(
    () => p.queue.map((trk, i) => ({ trk, i })).filter(({ i }) => i < p.currentIndex),
    [p.queue, p.currentIndex]
  );

  const displayUpcoming = dragRows || upcoming;
  const visibleUpcoming = displayUpcoming.filter(({ trk }) => !query.trim() || [trk.title, trk.artist, trk.uploader_name].some((value) => (value || "").toLowerCase().includes(query.trim().toLowerCase())));

  if (!open) return null;

  const transitionLabel =
  t.mode === TRANSITION_MODES.OFF ?
  null :
  t.isGapless ?
  "Gapless" :
  t.isCrossfade ?
  `Crossfade ${t.crossfadeSeconds}s` :
  null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Playback queue" data-public-dialog tabIndex={-1} onKeyDown={(e) => {if (e.key === "Escape") {e.stopPropagation();if (showPicker) setShowPicker(false);else onClose?.();}}} className="queue-panel fixed inset-0 z-[60] bg-card text-foreground flex flex-col animate-[fadeIn_.22s_ease-out]">
      {/* Header */}
      <div className="top-bar-safe flex items-center justify-between px-4 pt-2 pb-3 shrink-0 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          
          <div className="leading-tight min-w-0"><h2 className="text-xl font-semibold tracking-tight">Your queue</h2><p className="text-xs text-muted-foreground mt-1">{upcoming.length} up next{upcoming.length > 0 && upcoming.every(({trk}) => Number.isFinite(trk.duration_seconds) && trk.duration_seconds > 0) ? ` · ${formatTime(upcoming.reduce((sum, {trk}) => sum + trk.duration_seconds, 0))}` : ''}</p></div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowPicker(true)}
            className="queue-add-button chrome-button"
            aria-label="Add from library">
            <Plus size={18} /><span className="text-xs font-semibold">Add</span>
          </button>
          {upcoming.length > 0 &&
          <button
            onClick={() => {
              if (confirm("Clear all queued tracks?")) {
                const keep = p.queue.slice(0, p.currentIndex + 1);
                p.setQueue(keep);
              }
            }}
            className="p-2 rounded-full hover:bg-muted active:scale-90 transition text-muted-foreground"
            aria-label="Clear queue">
              <Trash2 size={18} />
            </button>
          }
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted active:scale-90 transition text-foreground"
            aria-label="Close">
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="queue-body flex-1 min-h-0 overflow-y-auto px-3 pb-10">
        {/* Now playing */}
        {p.currentTrack &&
        <div className="px-1 pt-3 pb-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-1 mb-1.5">
              Now playing
            </div>
            <div className="queue-now-playing flex items-center gap-3 px-2.5 py-2.5 rounded-xl">
              <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-muted shrink-0">
                <QueueCover url={p.currentTrack.cover_art_url} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">
                  {p.currentTrack.title}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {p.currentTrack.artist || p.currentTrack.uploader_name || "Unknown"}
                </div>
              </div>
              <button
              onClick={p.togglePlay}
              className="shrink-0 w-9 h-9 rounded-full bg-overlay-foreground text-overlay grid place-items-center active:scale-90 transition"
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
          className="w-full mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-foreground/[0.06] text-foreground/70 text-[11px] font-semibold active:scale-[0.99] transition">
            <GitMerge size={13} />
            <span className="flex-1 text-left">{transitionLabel} active</span>
            <span className="text-muted-foreground text-[10px]">Edit</span>
          </button>
        }

        {upcoming.length > 5 && <div className="collection-tools mt-2"><div className="relative w-full"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input style={{ paddingLeft: 38, paddingRight: 44 }} className="w-full" aria-label="Search upcoming songs" placeholder="Find a song up next" value={query} disabled={!!dragRows} onChange={(e) => setQuery(e.target.value)} />{query && <button className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-full" onClick={() => setQuery("")} aria-label="Clear queue search"><X size={15} /></button>}</div></div>}
        {query.trim() && <p className="text-xs text-muted-foreground px-2 mb-3">{visibleUpcoming.length} matching songs. Clear search to rearrange.</p>}
        {/* Upcoming */}
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-2 mb-1">
          {displayUpcoming.length ? "Next up" : ""}
        </div>
        {!displayUpcoming.length ?
        <div className="text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-muted grid place-items-center mx-auto mb-4">
              <Music2 size={30} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Your queue is empty.</p>
            <p className="text-xs text-muted-foreground">
              Add music from your library to choose what plays next.
            </p><button className="chrome-button mt-5" onClick={() => setShowPicker(true)}><Plus size={15} />Add music</button>
          </div> :

        <DragDropContext
          onDragStart={() => setDragRows(upcoming)}
          onDragEnd={(res) => {
            const rows = dragRows || upcoming;setDragRows(null);
            if (!res.destination) return;
            const source = rows[res.source.index]?.trk,target = rows[res.destination.index]?.trk;
            const from = p.queue.indexOf(source),to = p.queue.indexOf(target);
            // Playback and shared queue additions may advance during a drag.
            // Locate the same entries, and never move the song now playing.
            if (from <= p.currentIndex || to <= p.currentIndex || from === to) return;
            p.moveInQueue(from, to);
          }}>
          <Droppable droppableId="queue">
            {(dropProvided) =>
            <div className="space-y-0.5" ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
            {!visibleUpcoming.length && <div className="collection-empty"><h2>No matching songs</h2><button className="playlist-action" onClick={() => setQuery("")}>Show upcoming songs</button></div>}
            {visibleUpcoming.map(({ trk: tt, i }, pos) =>
              <Draggable key={tt.id + i} draggableId={tt.id + i} index={pos} isDragDisabled={!!query.trim()}>
            {(dragProvided, snapshot) =>
                <QueueMenuRow provided={dragProvided} dragging={snapshot.isDragging}>{lp=><>
                <div
                    {...dragProvided.dragHandleProps}
                    className="shrink-0 -ml-1 p-1 text-muted-foreground hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
                    aria-label="Reorder">
                  <GripVertical size={16} />
                </div>

            
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                  <QueueCover url={tt.cover_art_url} />
                  <button
                      onClick={() => p.playQueueItem(i)}
                      className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 group-hover:opacity-100 transition"
                      aria-label={`Play ${tt.title || "song"}`}>
                    <Play size={15} fill="white" />
                  </button>
                </div>
                <button
                    onClick={() => p.playQueueItem(i)}
                    className="min-w-0 flex-1 text-left">
                  <div className="text-sm font-medium truncate">{tt.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {tt.artist || tt.uploader_name || "Unknown"}
                  </div>
                </button>
                <span className="hidden sm:block text-[11px] text-muted-foreground tabular-nums">
                  {Number.isFinite(tt.duration_seconds) && tt.duration_seconds > 0 ? formatTime(tt.duration_seconds) : '—'}
                </span>

                <TrackOptionsMenu
                    className="song-menu-reveal" openSignal={lp.signal} anchorRef={lp.ref}
                    track={tt}
                    size={16}
                    buttonClassName="w-8 h-8 rounded-full grid place-items-center text-muted-foreground hover:text-foreground hover:bg-accent active:scale-90 transition"
                    items={[{ icon: Trash2, label: "Remove from queue", danger: true, onClick: () => p.removeFromQueue(i) }]} />
              </>}</QueueMenuRow>
                }
          </Draggable>
              )}
            {dropProvided.placeholder}
          </div>
            }
          </Droppable>
        </DragDropContext>
        }

        {/* History */}
        {history.length > 0 &&
        <details className="queue-history border-t border-border mt-4 pt-3">
            <summary className="text-xs font-semibold text-muted-foreground px-2 mb-3 cursor-pointer">Previously played · {history.length}</summary>
            <div className="space-y-0.5">
              {history.map(({ trk: tt, i }) =>
            <button
              key={tt.id + i}
              onClick={() => p.playQueueItem(i)}
              className="group flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-accent transition w-full text-left">
              
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0 opacity-60">
                    <QueueCover url={tt.cover_art_url} />
                    <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
                      <Play size={14} fill="white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate text-muted-foreground">{tt.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {tt.artist || tt.uploader_name || "Unknown"}
                    </div>
                  </div>
                  <span className="hidden sm:block text-[11px] text-muted-foreground tabular-nums">
                    {Number.isFinite(tt.duration_seconds) && tt.duration_seconds > 0 ? formatTime(tt.duration_seconds) : '—'}
                  </span>
                </button>
            )}
            </div>
          </details>
        }
      </div>

      <QueueLibraryPicker open={showPicker} onClose={() => setShowPicker(false)} />
    </div>, document.body);

}