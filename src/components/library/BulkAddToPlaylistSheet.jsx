import {Image} from "@/components/ui/image";
import { useState,useRef,useEffect } from "react";
import {addPlaylistTracks} from "@/lib/playlistActions";
import { ListMusic, Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Appends every selected track to the chosen playlist in one go.
/** @param {any} props */
export default function BulkAddToPlaylistSheet({ trackIds = [], playlists, error=false, onRetry, onClose, onDone }) {
  const [busyId, setBusyId] = useState(null);
  const { toast } = useToast();
  const [query,setQuery]=useState("");
  const lock=useRef(false),alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const filtered=(playlists||[]).filter(playlist=>!query.trim()||(playlist.name||"").toLowerCase().includes(query.trim().toLowerCase()));

  const add = async (playlist) => {
    if(lock.current||!trackIds.length)return;lock.current=true;
    setBusyId(playlist.id);
    try {
      // The server merges against the current playlist; a cached card may be stale.
      await addPlaylistTracks(playlist.id,[...new Set(trackIds)]);
      toast({ title:"Playlist updated", description:`Selected songs saved to ${playlist.name}` });
      if(alive.current)onDone?.();
    } catch {
      toast({ title: "Couldn't add to playlist", variant: "destructive" });
    } finally {
      lock.current=false;if(alive.current)setBusyId(null);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Add selected songs to a playlist" data-public-dialog tabIndex={-1} onKeyDown={event=>{if(event.key==="Escape"){event.stopPropagation();onClose();}}}
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-background w-full md:max-w-md rounded-t-3xl md:rounded-3xl border border-border shadow-2xl flex flex-col max-h-[85dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold flex items-center gap-2">
              <ListMusic size={16} /> Add to playlist
            </h3>
            <p className="text-xs text-foreground/50 mt-0.5">
              {trackIds.length} {trackIds.length === 1 ? "song" : "songs"} selected
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/5" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pt-4"><input aria-label="Search playlists for selected songs" value={query} placeholder="Find a playlist" onChange={event=>setQuery(event.target.value)} className="w-full bg-background border rounded-xl p-3"/></div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {!playlists ? (
            <div className="grid place-items-center py-12 text-foreground/50">
              {error?<button className="playlist-action" onClick={onRetry}>Refresh playlists</button>:<Loader2 className="animate-spin" size={20} />}
            </div>
          ) : !filtered.length ? (
            <p className="text-center text-sm text-foreground/55 py-12 px-6">
              {query?'No matching playlists.':'Create a playlist from your library to get started.'}
            </p>
          ) : (
            filtered.map((pl) => (
              <button
                key={pl.id}
                onClick={() => add(pl)}
                disabled={!!busyId}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left hover:bg-accent transition disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-foreground/10 grid place-items-center shrink-0">
                  {pl.cover_art_url ? (
                    <Image src={pl.cover_art_url} fittingType="fill" alt="" className="w-full h-full"/>
                  ) : (
                    <ListMusic size={16} className="text-foreground/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{pl.name}</div>
                  <div className="text-xs text-foreground/50">
                    {new Set(pl.track_ids||[]).size} {new Set(pl.track_ids||[]).size === 1 ? "song" : "songs"}
                  </div>
                </div>
                {busyId === pl.id && <Loader2 size={16} className="animate-spin text-foreground/50" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}