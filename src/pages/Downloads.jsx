import { useMemo, useState } from "react";
import {
  CloudOff,
  Play,
  Pause,
  Trash2,
  Loader2,
  GripVertical } from
"lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { usePlayer } from "@/context/PlayerContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { formatTime, bytesToReadable } from "@/lib/audio-utils";
import PullToRefresh from "@/components/PullToRefresh";
import DownloadCover from "@/components/DownloadCover";
import { useToast } from "@/components/ui/use-toast";

// PUBLIC OFFLINE — locally-cached tracks that play without Wi-Fi or data.
// Everything here runs off IndexedDB blobs already on the device, so the page
// is fully usable on airplane mode.
export default function Downloads() {
  const p = usePlayer();
  const cache = useOfflineCache();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [query,setQuery]=useState("");
  const [clearing,setClearing]=useState(false);

  const tracks = useMemo(
    () =>
    cache.records.map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.artist || r.uploader_name,
      uploader_name: r.uploader_name,
      uploader_id: r.uploader_id,
      cover_art_url: r.cover_art_url,
      audio_url: r.audio_url,
      duration_seconds: r.duration_seconds,
      genre: r.genre,
      explicit: r.explicit,
      _coverBlob: r._coverBlob,
      _private_audio: !!r._private_audio,
      _offline: true
    })),
    [cache.records]
  );

  const visibleTracks=useMemo(()=>tracks.map((track,index)=>({track,index})).filter(({track})=>!query.trim()||[track.title,track.artist].some(value=>(value||"").toLowerCase().includes(query.trim().toLowerCase()))),[tracks,query]);
  const totalBytes = useMemo(
    () => cache.records.reduce((sum, r) => sum + (r._size || 0), 0),
    [cache.records]
  );

  const isCurrent = (id) => p.currentTrack?.id === id;
  const anyPlayingHere=visibleTracks.some(({track})=>track.id===p.currentTrack?.id)&&p.isPlaying;

  const playAll=()=>{const list=visibleTracks.map(row=>row.track);if(!list.length)return;if(list.some(track=>track.id===p.currentTrack?.id)&&p.isPlaying)p.togglePlay();else p.playTrackAt(list,0);};

  const playOne = (i) => {
    if (isCurrent(tracks[i].id)) {
      p.togglePlay();
      return;
    }
    p.playTrackAt(tracks, i);
  };

  const removeOne = async (id) => {
    if(await cache.removeTrack(id))toast({ title: "Removed from PUBLIC OFFLINE" });
  };

  const clearEverything=async()=>{if(clearing)return;setClearing(true);try{if(await cache.clearAllCache()){setConfirming(false);toast({title:"Offline music cleared"});}}finally{setClearing(false);}};

  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  const loading = cache.loading;

  const onDragEnd = (res) => {
    setDragging(false);
    if (!res.destination || res.source.index === res.destination.index) return;
    const ids = tracks.map((t) => t.id);
    const [moved] = ids.splice(res.source.index, 1);
    ids.splice(res.destination.index, 0, moved);
    cache.reorder(ids);
  };

  return (
    <div className="downloads-page max-w-3xl mx-auto">
      <header className="page-intro"><h1>PUBLIC Offline</h1><p>Saved for listening without Wi-Fi or data.</p></header>
      

      










      

      {/* Status card */}
      
















      

      {!online &&
      <div className="mb-5 rounded-2xl bg-foreground/[0.05] px-4 py-3 flex items-center gap-2.5 text-sm text-foreground/70">
          <CloudOff size={16} />
          You're offline — but your saved tracks still play perfectly.
        </div>
      }

      <div className="collection-tools"><input aria-label="Search offline music" placeholder="Find a saved song or artist" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setQuery("");}}/>{query&&<button className="playlist-action" onClick={()=>setQuery("")}>Clear search</button>}</div>
      {query&&<p className="text-xs text-muted-foreground mb-3">{visibleTracks.length} matching songs. Clear search to rearrange your music.</p>}
      <PullToRefresh disabled={dragging} onRefresh={async () => await cache.refresh()}>
        {loading ?
        <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-foreground/40" />
          </div> :
        cache.storageAvailable===false&&tracks.length===0 ?
        <div className="text-center py-12"><button className="playlist-action" onClick={()=>cache.refresh()}>Retry offline music</button></div> :
        tracks.length === 0 ?
        <div className="text-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-foreground/[0.05] grid place-items-center mx-auto mb-4">
              <CloudOff size={28} className="text-foreground/35" />
            </div>
            <h2 className="text-lg font-extrabold tracking-tight mb-1.5">
              No offline music yet
            </h2>
            <p className="text-sm text-foreground/50 max-w-xs mx-auto">
              Open a song’s menu and choose Add to offline to save it here for listening without a connection.
            </p>
          </div> :

        <>
            {tracks.length > 0 &&
          <div className="flex items-center justify-between mb-3 px-1">
                <button onClick={() => setConfirming(true)} className="border rounded-full px-3 py-2 text-xs">Clear offline music</button>
                <button
              onClick={playAll} disabled={!visibleTracks.length}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-bold active:scale-95 transition">
                  {anyPlayingHere ? <Pause size={15} /> : <Play size={15} />}
                  {anyPlayingHere ? "Pause" : query ? "Play results" : "Play all"}
                </button>
                



            
              </div>
          }

            {!visibleTracks.length && <div className="collection-empty"><h2>No matching songs</h2><p>Try another title or artist.</p><button className="playlist-action" onClick={()=>setQuery("")}>Show all offline music</button></div>}
            <DragDropContext onDragStart={() => setDragging(true)} onDragEnd={onDragEnd}>
              <Droppable droppableId="downloads">
                {(dropProvided) =>
              <div ref={dropProvided.innerRef} {...dropProvided.droppableProps} className="space-y-1 touch-pan-y">
                  {visibleTracks.map(({track:t,index:i},visibleIndex) => {
                  const here = isCurrent(t.id);
                  const playingHere = here && p.isPlaying;
                  return (
                    <Draggable key={t.id} draggableId={t.id} index={visibleIndex} isDragDisabled={!!query}>
                      {(dragProvided, snapshot) =>
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        onDoubleClick={() => playOne(i)}
                        style={{ ...dragProvided.draggableProps.style, overscrollBehavior: "contain", touchAction: snapshot.isDragging ? "none" : "pan-y" }}
                        className={`group flex items-center gap-2 px-2 py-2 rounded-lg transition ${
                        snapshot.isDragging ? "bg-foreground/[0.06] ring-1 ring-border shadow-lg" : "hover:bg-foreground/[0.03]"}`}>
                      <div
                          {...dragProvided.dragHandleProps}
                          className="shrink-0 -ml-1 p-1 text-foreground/30 hover:text-foreground/70 cursor-grab active:cursor-grabbing touch-none"
                          aria-label="Reorder">
                        <GripVertical size={16} />
                      </div>
                      <button
                          onClick={() => playOne(i)}
                          className="w-10 h-10 rounded overflow-hidden shrink-0 relative bg-foreground/10 grid place-items-center"
                          aria-label={playingHere?`Pause ${t.title}`:`Play ${t.title}`}>
                        <DownloadCover record={t} size={16} />
                        <span className="absolute inset-0 grid place-items-center bg-black/0 group-hover:bg-black/30 transition">
                          {playingHere ?
                            <Pause size={15} className="text-white" /> :

                            <Play size={15} className="text-white opacity-0 group-hover:opacity-100 transition" />
                            }
                        </span>
                      </button>
                      <button
                          onClick={() => playOne(i)}
                          className="min-w-0 flex-1 text-left">
                        <div className="text-sm font-medium truncate flex items-center gap-1.5">
                          {t.title}
                          {t.explicit &&
                            <span className="px-1 py-0.5 rounded bg-foreground/15 text-[9px] font-extrabold">
                              E
                            </span>
                            }



                        </div>
                        <div className="text-xs text-foreground/50 truncate">
                          {t.artist || t.uploader_name || "Unknown"}
                        </div>
                      </button>
                      <div className="hidden sm:block text-xs text-foreground/40 w-10 text-right">
                        {formatTime(t.duration_seconds)}
                      </div>
                      <button
                          onClick={() => removeOne(t.id)}
                          className="p-2 rounded-full text-foreground/45 hover:text-destructive hover:bg-destructive/5 active:scale-90 transition shrink-0"
                          aria-label={`Remove ${t.title} from offline music`}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                      }
                    </Draggable>);

                })}
                {dropProvided.placeholder}
                </div>
              }
              </Droppable>
            </DragDropContext>
          </>
        }
      </PullToRefresh>

      {confirming &&
      <div className="fixed inset-0 z-50 grid place-items-center p-6 bg-black/40">
          <div className="bg-card rounded-2xl ring-1 ring-border max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-destructive/10 grid place-items-center mx-auto mb-3">
              <Trash2 size={20} className="text-destructive" />
            </div>
            <h3 className="text-lg font-extrabold tracking-tight mb-1.5">
              Remove all offline music?
            </h3>
            <p className="text-sm text-foreground/55 mb-5">
              This deletes {cache.records.length} saved track
              {cache.records.length === 1 ? "" : "s"} (
              {bytesToReadable(totalBytes)}) from this device.
            </p>
            <div className="flex items-center gap-2">
              <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-2.5 rounded-full bg-foreground/[0.06] text-sm font-bold active:scale-95 transition">
                Cancel
              </button>
              <button
              onClick={clearEverything} disabled={clearing}
              className="flex-1 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-bold active:scale-95 transition">
                {clearing?"Removing…":"Remove all"}
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}

function isPlaying(tracks, p) {
  return tracks.some((t) => t.id === p.currentTrack?.id);
}