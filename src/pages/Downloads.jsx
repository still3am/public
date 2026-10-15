import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CloudDownload, CloudOff, Play, Pause, Shuffle, Trash2, Loader2, GripVertical, Search, X, ArrowDownUp, Check, HardDrive } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { usePlayer } from "@/context/PlayerContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { formatTime, bytesToReadable } from "@/lib/audio-utils";
import { shufflePlaylist } from "@/lib/playlistActions";
import DownloadCover from "@/components/DownloadCover";
import { useToast } from "@/components/ui/use-toast";

export default function Downloads() {
  const p = usePlayer(),cache = useOfflineCache(),{ toast } = useToast();
  const [query, setQuery] = useState(""),[sort, setSort] = useState("saved"),[editing, setEditing] = useState(false),[confirming, setConfirming] = useState(false),[clearing, setClearing] = useState(false),[removing, setRemoving] = useState(new Set()),[online, setOnline] = useState(() => navigator.onLine);
  const removeLocks = useRef(new Set()),clearLock = useRef(false);
  useEffect(() => {const update = () => setOnline(navigator.onLine);window.addEventListener("online", update);window.addEventListener("offline", update);return () => {window.removeEventListener("online", update);window.removeEventListener("offline", update);};}, []);
  const tracks = useMemo(() => cache.records.map(({ _blob, ...row }) => ({ ...row, _offline: true })), [cache.records]);
  const view = useMemo(() => {
    const term = query.trim().toLowerCase(),rows = tracks.filter((t) => !term || [t.title, t.artist, t.uploader_name].some((v) => (v || "").toLowerCase().includes(term)));
    if (sort === "title") rows.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    if (sort === "artist") rows.sort((a, b) => (a.artist || "").localeCompare(b.artist || "") || (a.title || "").localeCompare(b.title || ""));
    return rows;
  }, [tracks, query, sort]);
  const totalBytes = cache.records.reduce((sum, r) => sum + (r._size || r._blob?.size || 0), 0),seconds = tracks.reduce((sum, t) => sum + (t.duration_seconds || 0), 0);
  const duration = seconds >= 3600 ? Math.floor(seconds / 3600) + " hr " + Math.floor(seconds % 3600 / 60) + " min" : Math.floor(seconds / 60) + " min";
  const downloading = Object.values(cache.downloading).filter(Boolean).length;
  const playing = !!p.isPlaying && view.some((t) => t.id === p.currentTrack?.id);
  const canReorder = editing && !query && sort === "saved";
  function play(track) {
    if (p.currentTrack?.id === track.id) {p.togglePlay();return;}
    p.setShuffle(false);p.playTrackAt(view, view.findIndex((t) => t.id === track.id));
  }
  function playAll(shuffle = false) {
    if (!view.length) return;
    if (!shuffle && view.some((t) => t.id === p.currentTrack?.id)) {p.togglePlay();return;}
    p.setShuffle(false);p.playTrackAt(shuffle ? shufflePlaylist(view) : view, 0);
  }
  async function remove(id) {
    if (removeLocks.current.has(id) || clearLock.current) return;
    removeLocks.current.add(id);setRemoving(new Set(removeLocks.current));
    try {const ok = await cache.removeTrack(id);toast(ok ? { title: "Removed from this device" } : { title: "Couldn’t remove this download. Try again.", variant: "destructive" });} finally
    {removeLocks.current.delete(id);setRemoving(new Set(removeLocks.current));}
  }
  async function clear() {
    if (clearLock.current || removeLocks.current.size) return;
    clearLock.current = true;setClearing(true);
    try {const ok = await cache.clearAllCache();if (ok) {setConfirming(false);setEditing(false);}toast(ok ? { title: "Downloads removed from this device" } : { title: "Couldn’t clear offline music. Try again.", variant: "destructive" });} finally
    {clearLock.current = false;setClearing(false);}
  }
  async function reorder(result) {
    if (!canReorder || !result.destination || result.destination.index === result.source.index) return;
    const ids = tracks.map((t) => t.id),[moved] = ids.splice(result.source.index, 1);ids.splice(result.destination.index, 0, moved);
    if (!(await cache.reorder(ids))) toast({ title: "Couldn’t save the song order. Please try again.", variant: "destructive" });
  }
  return <div className="downloads-page max-w-4xl mx-auto pb-8">
  <Link to="/library" className="inline-flex items-center gap-1.5 min-h-11 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft size={18} />Library</Link>
  <header className="mb-7">
   <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-semibold tracking-[.18em] uppercase text-muted-foreground mb-2 hidden">PUBLIC. ON YOUR DEVICE</p><h1 className="text-4xl md:text-5xl font-bold tracking-tight">Offline</h1></div><div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-foreground/[0.05] border grid place-items-center hidden"><CloudDownload size={27} strokeWidth={1.5} /></div></div>
   <p className="text-sm text-muted-foreground mt-3 leading-relaxed">Your music, ready wherever you go.</p>
  </header>
  <section className="rounded-3xl border bg-card p-4 md:p-6 mb-6" aria-label="Download storage">
   <div className="flex gap-4 items-center">
    <div className="grid grid-cols-2 w-20 h-20 md:w-24 md:h-24 gap-0.5 rounded-2xl overflow-hidden shrink-0 bg-muted">{Array.from({ length: 4 }, (_, i) => <div key={i} className="grid place-items-center overflow-hidden bg-foreground/[0.04]">{tracks[i] ? <DownloadCover record={tracks[i]} size={17} /> : <CloudOff size={17} className="text-muted-foreground/30" />}</div>)}</div>
    <div className="min-w-0"><p className="font-semibold text-lg">{tracks.length} {tracks.length === 1 ? "song" : "songs"} saved</p><p className="text-xs text-muted-foreground mt-1">{bytesToReadable(totalBytes)} on this device{seconds > 0 ? " · " + duration : ""}</p><p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2"><HardDrive size={13} />{online ? "Available without a connection" : "Listening offline"}</p></div>
   </div>
   {tracks.length > 0 && <div className="flex gap-2 mt-5"><button type="button" onClick={() => playAll()} disabled={!view.length} className="min-h-11 flex-1 rounded-full bg-foreground text-background inline-flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-40">{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}{playing ? "Pause" : query ? "Play results" : "Play"}</button><button type="button" onClick={() => playAll(true)} disabled={!view.length} className="min-h-11 flex-1 border rounded-full inline-flex items-center justify-center gap-2 text-sm font-semibold hover:bg-accent disabled:opacity-40"><Shuffle size={18} />Shuffle</button></div>}
  </section>
  {(downloading > 0 || cache.syncing) && <div role="status" className="flex items-center gap-3 rounded-2xl bg-foreground/[0.04] border px-4 py-3 mb-5 text-sm"><Loader2 size={16} className="animate-spin shrink-0" /><span>{downloading ? "Saving " + downloading + " " + (downloading === 1 ? "song" : "songs") + " to this device…" : "Checking saved music…"}</span></div>}
  {cache.storageAvailable === false && <div role="alert" className="border rounded-2xl p-4 mb-5"><p className="text-sm font-semibold">Couldn’t access offline storage</p><p className="text-xs text-muted-foreground mt-1">Retry without clearing your saved music.</p><button type="button" className="mt-3 min-h-11 px-4 rounded-full border text-sm font-semibold" onClick={() => cache.refresh()}>Retry storage</button></div>}
  {(tracks.length > 0 || query) && <>
   <div className="relative mb-4"><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => {if (e.key === "Escape") setQuery("");}} aria-label="Search offline music" placeholder="Search your downloads" className="w-full h-12 rounded-2xl bg-foreground/[0.04] border pl-11 pr-12 text-sm" />{query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center"><X size={17} /></button>}</div>
   <div className="flex items-center justify-between gap-3 mb-3"><h2 className="font-semibold">{query ? view.length + " results" : "Songs"}</h2><div className="flex items-center gap-1"><label className="relative flex items-center"><ArrowDownUp size={14} className="absolute left-2.5 pointer-events-none text-muted-foreground" /><select aria-label="Sort offline music" value={sort} disabled={editing} onChange={(e) => setSort(e.target.value)} className="h-11 pl-8 pr-2 bg-transparent border-0 text-xs font-medium max-w-[135px]"><option value="saved">Your order</option><option value="title">Song title</option><option value="artist">Artist</option></select></label><button type="button" disabled={clearing} onClick={() => {setEditing(!editing);setSort("saved");setQuery("");}} className="min-h-11 px-3 rounded-full text-xs font-semibold border">{editing ? <span className="inline-flex items-center gap-1"><Check size={14} />Done</span> : "Reorder"}</button></div></div>
  </>}
  {cache.loading ? <div role="status" aria-label="Loading offline music" className="py-16 grid place-items-center"><Loader2 className="animate-spin text-muted-foreground" /></div> : !tracks.length ? <div className="text-center py-12 px-5 border border-dashed rounded-3xl"><CloudOff size={32} strokeWidth={1.4} className="text-muted-foreground mx-auto mb-4" /><h2 className="text-lg font-semibold">{downloading ? "Your music is on its way" : "Take your music with you"}</h2><p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2 leading-relaxed">Choose Add to offline in a song’s menu. Downloaded songs appear here.</p><Link to="/search" className="min-h-11 mt-5 px-5 inline-flex items-center rounded-full bg-foreground text-background font-semibold text-sm">Find music</Link>{online && !cache.syncing && <button type="button" onClick={() => cache.syncFromCloud()} className="block mx-auto min-h-11 text-xs text-muted-foreground mt-2 underline underline-offset-4">Check for saved downloads</button>}</div> : !view.length ? <div className="text-center py-12 text-sm text-muted-foreground">No matching songs. Try another title or artist.</div> : <DragDropContext onDragEnd={reorder}><Droppable droppableId="offline-songs">{(drop) => <div ref={drop.innerRef} {...drop.droppableProps} className="divide-y divide-border/60">{view.map((track, index) => <Draggable key={track.id} draggableId={track.id} index={index} isDragDisabled={!canReorder}>{(drag, snapshot) => <div ref={drag.innerRef} {...drag.draggableProps} style={drag.draggableProps.style} className={"flex items-center gap-3 py-3 px-1 rounded-xl " + (snapshot.isDragging ? "bg-card shadow-xl border" : "")}>
   {canReorder && <button type="button" {...drag.dragHandleProps} aria-label={"Move " + track.title} className="w-9 min-h-11 shrink-0 grid place-items-center touch-none text-muted-foreground"><GripVertical size={17} /></button>}
   <button type="button" onClick={() => play(track)} aria-label={(p.currentTrack?.id === track.id && p.isPlaying ? "Pause " : "Play ") + track.title} className="relative w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden shrink-0 bg-muted grid place-items-center"><DownloadCover record={track} size={18} />{p.currentTrack?.id === track.id && p.isPlaying && <span className="absolute inset-0 bg-black/35 grid place-items-center"><Pause size={18} fill="white" className="text-white" /></span>}</button>
   <button type="button" onClick={() => play(track)} className="min-w-0 flex-1 text-left min-h-11"><span className={"block truncate text-sm font-semibold " + (p.currentTrack?.id === track.id ? "text-foreground" : "")}>{track.title}</span><span className="block truncate text-xs text-muted-foreground mt-1">{track.artist || track.uploader_name || "Unknown artist"}{track.explicit ? " · E" : ""}</span></button>
   <span className="text-[11px] text-muted-foreground hidden sm:block tabular-nums">{formatTime(track.duration_seconds)}</span><button type="button" disabled={removing.has(track.id) || clearing} onClick={() => remove(track.id)} aria-label={"Remove " + track.title + " from this device"} className="w-11 h-11 shrink-0 rounded-full grid place-items-center text-muted-foreground hover:text-red-500 hover:bg-red-500/5 disabled:opacity-40">{removing.has(track.id) ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}</button>
  </div>}</Draggable>)}{drop.placeholder}</div>}</Droppable></DragDropContext>}
  <footer className="mt-7 pt-5 border-t"><p className="text-xs text-muted-foreground leading-relaxed">Signing out keeps this account’s downloads on this device. Sign back in to the same account to see them again.</p>{tracks.length > 0 && <button type="button" disabled={clearing || removing.size > 0} onClick={() => setConfirming(true)} className="min-h-11 inline-flex items-center gap-2 mt-3 text-xs text-red-500 font-semibold"><Trash2 size={14} />Remove all downloads</button>}</footer>
  {confirming && <div role="dialog" aria-modal="true" aria-label="Remove offline downloads" data-public-dialog tabIndex={-1} onKeyDown={(e) => {if (e.key === "Escape" && !clearing) {e.stopPropagation();setConfirming(false);}}} className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-5" onClick={() => {if (!clearing) setConfirming(false);}}><div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card border rounded-t-3xl sm:rounded-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"><h2 className="text-xl font-bold tracking-tight">Remove downloads?</h2><p className="text-sm text-muted-foreground leading-relaxed mt-3">Remove {tracks.length} downloaded {tracks.length === 1 ? "song" : "songs"} ({bytesToReadable(totalBytes)}) from this device. Your library and other devices stay unchanged.</p><div className="grid grid-cols-2 gap-3 mt-6"><button type="button" disabled={clearing} onClick={() => setConfirming(false)} className="min-h-12 rounded-full border font-semibold text-sm">Keep music</button><button type="button" disabled={clearing} onClick={clear} className="min-h-12 rounded-full bg-red-600 text-white font-semibold text-sm disabled:opacity-50">{clearing ? "Removing…" : "Remove"}</button></div></div></div>}
 </div>;
}