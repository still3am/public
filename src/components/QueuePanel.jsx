import { useLongPressMenu } from '@/hooks/useLongPressMenu';
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import {
  X, Trash2, Play, Pause, Plus, Music2, GripVertical, GitMerge, Search,
  SkipBack, SkipForward, Undo2, ListMusic } from
"lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { formatTime } from "@/lib/audio-utils";
import QueueLibraryPicker from "@/components/QueueLibraryPicker";
import TrackOptionsMenu from "@/components/track/TrackOptionsMenu";
import { useTransitions } from "@/hooks/useTransitions";
import { TRANSITION_MODES } from "@/lib/transitions";

function QueueCover({ url }) {
  const cover = useCoverUrl(url);
  return cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : <Music2 size={18} className="text-muted-foreground" />;
}

/** @param {any} props */
function QueueMenuRow({ provided, dragging, children }) {
  const lp = useLongPressMenu(dragging, { allowButtons: true });
  return <div ref={(node) => {provided.innerRef(node);lp.ref.current = node;}} {...provided.draggableProps} {...lp.handlers}
  onClickCapture={(event) => {if (lp.consumeLongPress()) {event.preventDefault();event.stopPropagation();}}}
  style={{ ...provided.draggableProps.style, touchAction: dragging ? 'none' : 'pan-y' }}
  className={'queue-upcoming-row song-menu-surface group flex items-center gap-3 px-2 py-2 rounded-xl transition ' + (dragging ? 'bg-accent ring-1 ring-border' : 'hover:bg-accent')}>{children(lp)}</div>;
}

export default function QueuePanel({ open, onClose, embedded = false }) {
  const p = usePlayer();
  const t = useTransitions();
  const nav = useNavigate();
  const [showPicker, setShowPicker] = useState(false);
  const [query, setQuery] = useState("");
  const [dragRows, setDragRows] = useState(null);
  const [undoTracks, setUndoTracks] = useState(null);
  const undoTimer = useRef(null);

  useEffect(() => {
    if (!open) {setShowPicker(false);setQuery("");setDragRows(null);}
  }, [open]);
  useEffect(() => () => window.clearTimeout(undoTimer.current), []);

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
  const totalSeconds = upcoming.every(({ trk }) => Number.isFinite(trk.duration_seconds) && trk.duration_seconds > 0) ?
  upcoming.reduce((sum, { trk }) => sum + trk.duration_seconds, 0) : 0;

  if (!open) return null;

  const transitionLabel = t.mode === TRANSITION_MODES.OFF ?
  null :
  t.isGapless ? "Gapless" :
  t.isCrossfade ? "Crossfade " + t.crossfadeSeconds + "s" :
  null;

  const clearUpcoming = () => {
    if (!upcoming.length) return;
    const removed = p.queue.slice(p.currentIndex + 1);
    setUndoTracks(removed);
    p.setQueue(p.queue.slice(0, p.currentIndex + 1));
    window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndoTracks(null), 8000);
  };

  const undoClear = () => {
    if (!undoTracks?.length) return;
    p.setQueue((current) => [...current, ...undoTracks]);
    setUndoTracks(null);
    window.clearTimeout(undoTimer.current);
  };

  const panel =
  <div role={embedded ? "region" : "dialog"} aria-modal={embedded ? undefined : "true"} aria-label="Playback queue" data-public-dialog={embedded ? undefined : true} tabIndex={embedded ? undefined : -1}
  onKeyDown={(e) => {if (e.key === "Escape") {e.stopPropagation();if (showPicker) setShowPicker(false);else onClose?.();}}}
  className={`queue-panel ${embedded ? "queue-panel-embedded" : "fixed inset-0 z-[60] animate-[fadeIn_.22s_ease-out]"} bg-card text-foreground flex flex-col`}>
      <header className="queue-header top-bar-safe flex items-center justify-between px-4 pt-2 pb-3 shrink-0">
        <div className="queue-heading min-w-0">
          <span className="queue-eyebrow hidden">PUBLIC. / NOW PLAYING</span>
          <h2 className="text-xl font-semibold tracking-tight">Queue</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {upcoming.length} {upcoming.length === 1 ? "song" : "songs"} up next{totalSeconds ? " · " + formatTime(totalSeconds) : ""}
          </p>
        </div>
        <div className="queue-header-actions flex items-center gap-1.5">
          <button type="button" onClick={() => setShowPicker(true)} className="queue-add-button chrome-button" aria-label="Add from library">
            <Plus size={17} /><span className="text-xs font-semibold">Add</span>
          </button>
          {upcoming.length > 0 && <button type="button" onClick={clearUpcoming} className="queue-clear-button" aria-label="Clear upcoming songs" title="Clear upcoming songs">Clear</button>}
          {!embedded && <button type="button" onClick={onClose} className="queue-close-button" aria-label="Close queue" title="Close queue"><X size={20} /></button>}
        </div>
      </header>

      {undoTracks?.length > 0 && <div className="queue-undo-banner" role="status" aria-live="polite">
        <span>Up Next cleared</span>
        <button type="button" onClick={undoClear}><Undo2 size={15} />Undo</button>
      </div>}

      <div className="queue-body flex-1 min-h-0 overflow-y-auto">
        {!embedded && p.currentTrack && <section className="queue-current-section">
          <div className="queue-section-heading"><span>Now playing</span><span className="queue-live-dot" aria-hidden="true" /></div>
          <div className="queue-now-playing">
            <div className="queue-current-art"><QueueCover url={p.currentTrack.cover_art_url} /></div>
            <div className="queue-current-copy">
              <strong title={p.currentTrack.title}>{p.currentTrack.title}</strong>
              {p.currentTrack._publicAutoplay && <em className="queue-autoplay-badge">PUBLIC AUTOPLAY</em>}
              <span title={p.currentTrack.artist || p.currentTrack.uploader_name || "Unknown"}>{p.currentTrack.artist || p.currentTrack.uploader_name || "Unknown"}</span>
              {!embedded && <>
                <div className="queue-current-progress" aria-label="Playback progress">
                  <div style={{ width: (p.duration ? Math.min(100, Math.max(0, p.position / p.duration * 100)) : 0) + "%" }} />
                </div>
                <div className="queue-current-times"><span>{formatTime(p.position)}</span><span>-{formatTime(Math.max(0, (p.duration || 0) - (p.position || 0)))}</span></div>
              </>}
            </div>
            {!embedded && <button type="button" onClick={p.togglePlay} className="queue-current-play" aria-label={p.isPlaying ? "Pause" : "Play"}>
              {p.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>}
          </div>
        </section>}

        {transitionLabel && <button type="button" onClick={() => {onClose();nav("/settings/transitions");}}
      className="queue-transition"><GitMerge size={14} /><span>{transitionLabel} active</span><span>Edit</span></button>}

        <section className="queue-next-section">
          <div className="queue-list-heading">
            <div className="hidden"><h3>Playing Next</h3><span>{upcoming.length} {upcoming.length === 1 ? "song" : "songs"}</span></div>
            {upcoming.length > 5 && <div className="queue-search-wrap"><Search size={15} aria-hidden="true" /><input aria-label="Search upcoming songs" placeholder="Search queue" value={query} disabled={!!dragRows} onChange={(e) => setQuery(e.target.value)} />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}</div>}
          </div>

          {!displayUpcoming.length ? <div className="queue-empty">
            <div className="queue-empty-icon"><ListMusic size={25} /></div>
            <strong>Nothing up next</strong>
            <p>Add songs from your library or use a song’s menu to play it next.</p>
            <button type="button" className="chrome-button" onClick={() => setShowPicker(true)}><Plus size={16} />Add music</button>
          </div> : <DragDropContext
          onDragStart={() => setDragRows(upcoming)}
          onDragEnd={(res) => {
            const rows = dragRows || upcoming;setDragRows(null);
            if (!res.destination) return;
            const source = rows[res.source.index]?.trk,target = rows[res.destination.index]?.trk;
            const from = p.queue.indexOf(source),to = p.queue.indexOf(target);
            if (from <= p.currentIndex || to <= p.currentIndex || from === to) return;
            p.moveInQueue(from, to);
          }}>
            <Droppable droppableId="queue">
              {(dropProvided) => <div className="queue-list" ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                {!visibleUpcoming.length && <div className="queue-no-matches"><strong>No matching songs</strong><button type="button" onClick={() => setQuery("")}>Show all upcoming songs</button></div>}
                {visibleUpcoming.map(({ trk: tt, i }, pos) => <Draggable key={tt.id + "-" + i} draggableId={tt.id + "-" + i} index={pos} isDragDisabled={!!query.trim()}>{(dragProvided, snapshot) =>
                <QueueMenuRow provided={dragProvided} dragging={snapshot.isDragging}>{(lp) => <>
                    <div {...dragProvided.dragHandleProps} className="queue-drag-handle" aria-label="Reorder song" title="Drag to reorder"><GripVertical size={17} /></div>
                    <div className="queue-track-art"><QueueCover url={tt.cover_art_url} /><button type="button" onClick={() => p.playQueueItem(i)} aria-label={"Play " + (tt.title || "song")}><Play size={14} fill="white" /></button></div>
                    <button type="button" onClick={() => p.playQueueItem(i)} className="queue-track-copy">
                      <strong>{tt.title}</strong><span>{tt.artist || tt.uploader_name || "Unknown"}</span>
                      {tt._publicAutoplay && <em className="queue-autoplay-badge">PUBLIC AUTOPLAY</em>}
                    </button>
                    <span className="queue-track-duration">{Number.isFinite(tt.duration_seconds) && tt.duration_seconds > 0 ? formatTime(tt.duration_seconds) : "—"}</span>
                    <TrackOptionsMenu className="song-menu-reveal" openSignal={lp.signal} anchorRef={lp.ref} track={tt} size={16}
                    buttonClassName="queue-track-menu"
                    items={[{ icon: Trash2, label: "Remove from queue", danger: true, onClick: () => p.removeFromQueue(i) }]} />
                  </>}</QueueMenuRow>
                }</Draggable>)}
                {dropProvided.placeholder}
              </div>}
            </Droppable>
          </DragDropContext>}
        </section>

        {history.length > 0 && <details className="queue-history">
          <summary>Previously played <span>{history.length}</span></summary>
          <div>{history.map(({ trk: tt, i }) => <button type="button" key={tt.id + "-" + i} onClick={() => p.playQueueItem(i)} className="queue-history-row">
            <div className="queue-history-art"><QueueCover url={tt.cover_art_url} /></div><span><strong>{tt.title}</strong><small>{tt.artist || tt.uploader_name || "Unknown"}</small></span><Play size={14} />
          </button>)}</div>
        </details>}
      </div>

      {!embedded && p.currentTrack && <footer className="queue-transport">
        <div className="queue-transport-song"><span>{p.currentTrack.title}</span><small>{p.currentTrack.artist || p.currentTrack.uploader_name || "Unknown"}</small></div>
        <div className="queue-transport-controls">
          <button type="button" onClick={p.prev} aria-label="Previous song"><SkipBack size={19} fill="currentColor" /></button>
          <button type="button" onClick={p.togglePlay} aria-label={p.isPlaying ? "Pause" : "Play"} className="queue-transport-main">{p.isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button>
          <button type="button" onClick={p.next} aria-label="Next song"><SkipForward size={19} fill="currentColor" /></button>
        </div>
      </footer>}

      <QueueLibraryPicker open={showPicker} onClose={() => setShowPicker(false)} />
    </div>;


  return embedded ? panel : createPortal(panel, document.body);
}